import { Statistics } from '../../players/models/player.model';
import { MatchEventRecord, MatchRecord } from '../../match-event-manager/models/match-event.model';
import { isScoringEvent } from '../../match-event-manager/utils/scoring.util';
import { formatDateToString } from '../../utils/date-utils';
import { calculatePerformance } from './performance.util';

// ---------- range ----------

export type StatsRange = '5' | '10' | 'all';

export const STATS_RANGES: { value: StatsRange; label: string }[] = [
  { value: '5', label: 'Last 5' },
  { value: '10', label: 'Last 10' },
  { value: 'all', label: 'All time' },
];

export const DEFAULT_RANGE: StatsRange = '10';

export function parseRange(value: string | null): StatsRange {
  return value === '5' || value === 'all' ? value : DEFAULT_RANGE;
}

/** The range as a query param value: null for the default, so the URL stays clean. */
export function rangeQueryParam(range: StatsRange): StatsRange | null {
  return range === DEFAULT_RANGE ? null : range;
}

/** The group's last N game days (dates sorted oldest first). */
export function datesInRange(allDates: string[], range: StatsRange): string[] {
  return range === 'all' ? allDates : allDates.slice(-Number(range));
}

// ---------- formatting ----------

/** 'dd-MM-yyyy' -> 'Nov 16', or 'Nov 16, 2025' with the year. */
export function formatDay(dateKey: string, withYear = false): string {
  const [day, month, year] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  });
}

/** True when the date keys (sorted oldest first) are not all in the same year, so dates need their year. */
export function spansMultipleYears(dates: string[]): boolean {
  const yearOf = (dateKey: string) => dateKey.split('-')[2];
  return dates.length > 0 && yearOf(dates[0]) !== yearOf(dates[dates.length - 1]);
}

/** 'Nov 2 – Nov 16' for date keys sorted oldest first; with years when the span crosses a year. */
export function formatDateSpan(dates: string[]): string {
  const withYear = spansMultipleYears(dates);
  return `${formatDay(dates[0], withYear)} – ${formatDay(dates[dates.length - 1], withYear)}`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// ---------- math ----------

/** part / whole, or 0 when whole is 0. */
export function ratio(part: number, whole: number): number {
  return whole ? part / whole : 0;
}

/** Whole-number percentage, e.g. 7 of 10 -> 70. */
export function percentOf(part: number, whole: number): number {
  return Math.round(ratio(part, whole) * 100);
}

/** roundTo(2.345, 1) -> 2.3 */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ---------- totals ----------

export interface PlayerTotals extends Statistics {
  gameDays: number;
  avgPerformance: number;
}

export function emptyStatistics(): Statistics {
  return { goals: 0, wins: 0, loses: 0, draws: 0, games: 0, goalsConceded: 0, scoredGames: 0, ownGoals: 0, cleanSheets: 0 };
}

/** Adds up a player's game days in `dates`. Avg performance is the average of the game-day scores. */
export function totalsForDates(statsByDate: Map<string, Statistics>, dates: string[]): PlayerTotals {
  const totals: PlayerTotals = { ...emptyStatistics(), gameDays: 0, avgPerformance: 0 };
  let performanceSum = 0;
  for (const date of dates) {
    const stats = statsByDate.get(date);
    if (!stats || stats.games === 0) continue;
    for (const key of Object.keys(emptyStatistics()) as (keyof Statistics)[]) {
      totals[key] += stats[key] || 0;
    }
    totals.gameDays++;
    performanceSum += calculatePerformance(stats);
  }
  totals.avgPerformance = totals.gameDays ? performanceSum / totals.gameDays : 0;
  return totals;
}

// ---------- matches ----------

export interface MatchSummary {
  dateKey: string;
  /** For a draw these are just the two sides. */
  winners: string[];
  losers: string[];
  isDraw: boolean;
  /** Scorer of the goal that put the winning team ahead for good; null for draws and own goals. */
  winningGoalPlayerId: string | null;
}

/** A Firestore Timestamp or a Date, in ms. 0 when missing. */
function timestampMs(value: any): number {
  if (value instanceof Date) return value.getTime();
  return (value?.seconds ?? 0) * 1000 + (value?.nanoseconds ?? 0) / 1e6;
}

/**
 * When the goal happened, in ms since kickoff. Every goal gets one value in the same unit, so the order is always consistent:
 * the exact timer time, else its minute (0 = the first minute), else an estimate from when it was saved.
 * The timer time keeps a goal added later in Manage Events in its real place.
 */
function goalTimeMs(goal: MatchEventRecord, kickoffMs: number): number {
  const timerMs = goal.payload?.['timerMs'];
  if (typeof timerMs === 'number') return timerMs;
  if (goal.minute != null) return goal.minute * 60_000;
  return timestampMs(goal.createdAt) - kickoffMs;
}

/** Goals in match order; two goals at the same time keep the order they were saved in. */
function sortGoalsByTime(goals: MatchEventRecord[], match: MatchRecord): MatchEventRecord[] {
  const kickoffMs = timestampMs(match.startedAt ?? match.createdAt);
  return [...goals].sort((first, second) =>
    goalTimeMs(first, kickoffMs) - goalTimeMs(second, kickoffMs)
    || timestampMs(first.createdAt) - timestampMs(second.createdAt)
  );
}

/**
 * The winner's (loser score + 1)th goal: after it, the other team never caught up.
 * Null when the logged goals don't match the saved score, because then we can't tell which goal it was.
 */
export function winningGoalPlayerId(match: MatchRecord, events: MatchEventRecord[]): string | null {
  if (match.gameStatus === 'draw' || !match.winner) return null;
  const goals = sortGoalsByTime(events.filter(event => isScoringEvent(event) && event.teamKey), match);
  const winnerGoals = goals.filter(goal => goal.teamKey === match.winner);
  const loserGoalCount = goals.length - winnerGoals.length;

  const winnerScore = match.wonTeamScore ?? winnerGoals.length;
  const loserScore = match.loseTeamScore ?? loserGoalCount;
  const goalsMatchScore = winnerGoals.length === winnerScore && loserGoalCount === loserScore;
  if (!goalsMatchScore) return null;

  const decisiveGoal = winnerGoals[loserScore];
  return decisiveGoal?.type === 'player_goal' ? decisiveGoal.playerId ?? null : null;
}

/** Completed matches, oldest first. */
export function buildMatchSummaries(matches: { match: MatchRecord; events: MatchEventRecord[] }[]): MatchSummary[] {
  return matches
    .filter(({ match }) => match.status === 'completed' && match.createdAt?.seconds)
    .sort((first, second) => first.match.createdAt.seconds - second.match.createdAt.seconds)
    .map(({ match, events }) => ({
      dateKey: formatDateToString(new Date(match.createdAt.seconds * 1000)),
      winners: match.winnerPlayerIds || [],
      losers: match.loserPlayerIds || [],
      isDraw: match.gameStatus === 'draw',
      winningGoalPlayerId: winningGoalPlayerId(match, events),
    }));
}

/** Only the matches played on one of `dates`. */
export function matchesOnDates(matches: MatchSummary[], dates: string[]): MatchSummary[] {
  const dateSet = new Set(dates);
  return matches.filter(match => dateSet.has(match.dateKey));
}

export interface HeadToHead {
  together: { matches: number; wins: number; draws: number; losses: number };
  against: { matches: number; firstPlayerWins: number; draws: number; secondPlayerWins: number };
}

/** Matches the two players played on the same team, and against each other. */
export function countHeadToHead(matches: MatchSummary[], firstPlayerId: string, secondPlayerId: string): HeadToHead {
  const result: HeadToHead = {
    together: { matches: 0, wins: 0, draws: 0, losses: 0 },
    against: { matches: 0, firstPlayerWins: 0, draws: 0, secondPlayerWins: 0 },
  };
  for (const match of matches) {
    const firstWon = match.winners.includes(firstPlayerId);
    const firstLost = match.losers.includes(firstPlayerId);
    const secondWon = match.winners.includes(secondPlayerId);
    const secondLost = match.losers.includes(secondPlayerId);
    const bothPlayed = (firstWon || firstLost) && (secondWon || secondLost);
    if (!bothPlayed) continue;

    if (firstWon === secondWon) {
      result.together.matches++;
      if (match.isDraw) result.together.draws++;
      else if (firstWon) result.together.wins++;
      else result.together.losses++;
    } else {
      result.against.matches++;
      if (match.isDraw) result.against.draws++;
      else if (firstWon) result.against.firstPlayerWins++;
      else result.against.secondPlayerWins++;
    }
  }
  return result;
}

/** Most matches won in a row, per player. A draw or a loss ends the streak. */
export function longestWinStreaks(matches: MatchSummary[]): Map<string, number> {
  const currentStreaks = new Map<string, number>();
  const bestStreaks = new Map<string, number>();
  for (const match of matches) {
    for (const playerId of match.winners) {
      const streak = match.isDraw ? 0 : (currentStreaks.get(playerId) ?? 0) + 1;
      currentStreaks.set(playerId, streak);
      bestStreaks.set(playerId, Math.max(bestStreaks.get(playerId) ?? 0, streak));
    }
    for (const playerId of match.losers) currentStreaks.set(playerId, 0);
  }
  return bestStreaks;
}

/** Match-winning goals per player. */
export function countWinningGoals(matches: MatchSummary[]): Map<string, number> {
  const winningGoals = new Map<string, number>();
  for (const match of matches) {
    const scorerId = match.winningGoalPlayerId;
    if (scorerId) winningGoals.set(scorerId, (winningGoals.get(scorerId) ?? 0) + 1);
  }
  return winningGoals;
}

export interface DuoRecord {
  matches: number;
  wins: number;
}

/** Matches and wins for every pair that played on the same team. Key: the two ids sorted, joined by ','. */
export function duoRecords(matches: MatchSummary[]): Map<string, DuoRecord> {
  const records = new Map<string, DuoRecord>();
  for (const match of matches) {
    for (const [teamPlayerIds, won] of [[match.winners, !match.isDraw], [match.losers, false]] as const) {
      for (let i = 0; i < teamPlayerIds.length; i++) {
        for (let j = i + 1; j < teamPlayerIds.length; j++) {
          const key = [teamPlayerIds[i], teamPlayerIds[j]].sort().join(',');
          const record = records.get(key) ?? { matches: 0, wins: 0 };
          record.matches++;
          if (won) record.wins++;
          records.set(key, record);
        }
      }
    }
  }
  return records;
}

// ---------- ranking ----------

/**
 * Places 1-3 with ties sharing a place (1, 2, 2, then no 3). At most `limit` rows.
 */
export function rankTopThree<T extends { value: number }>(entries: T[], better: 'high' | 'low' = 'high', limit = 5): (T & { rank: number })[] {
  const sorted = [...entries].sort((first, second) => better === 'low' ? first.value - second.value : second.value - first.value);
  const ranked: (T & { rank: number })[] = [];
  sorted.forEach((entry, index) => {
    const rank = index > 0 && sorted[index - 1].value === entry.value ? ranked[index - 1].rank : index + 1;
    ranked.push({ ...entry, rank });
  });
  return ranked.filter(entry => entry.rank <= 3).slice(0, limit);
}
