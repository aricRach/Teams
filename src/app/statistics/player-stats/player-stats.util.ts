import { ChartDataset, ChartOptions } from 'chart.js';
import { Player, Statistics } from '../../players/models/player.model';
import { calculatePerformance, PERFORMANCE_POINTS } from '../utils/performance.util';
import {
  countHeadToHead, emptyStatistics, formatDay, MatchSummary, percentOf, PlayerTotals, plural, ratio, roundTo, spansMultipleYears,
} from '../utils/player-insights.util';

export const MAX_COMPARED_PLAYERS = 4;
/** One color per slot (1st-4th player), so two players from the same team still look different. */
export const PLAYER_COLORS = ['#00a383', '#3b6fd8', '#e07a2e', '#a64fc4'];

// ---------- chart choices ----------

export type ChartStat = 'goals' | 'wins' | 'winPct' | 'performance';
export type ChartMode = 'day' | 'cumulative';

export const DEFAULT_CHART_STAT: ChartStat = 'goals';
export const DEFAULT_CHART_MODE: ChartMode = 'day';

export const CHART_STATS: { value: ChartStat; label: string }[] = [
  { value: 'goals', label: 'Goals' },
  { value: 'wins', label: 'Wins' },
  { value: 'winPct', label: 'Win %' },
  { value: 'performance', label: 'Performance' },
];

export const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: 'day', label: 'Each day' },
  { value: 'cumulative', label: 'Total so far' },
];

export function parseChartStat(value: string | null): ChartStat {
  return CHART_STATS.find(stat => stat.value === value)?.value ?? DEFAULT_CHART_STAT;
}

export function parseChartMode(value: string | null): ChartMode {
  return value === 'cumulative' ? 'cumulative' : DEFAULT_CHART_MODE;
}

/** Comma-separated ids from the URL, without duplicates. */
export function parsePlayerIds(value: string | null): string[] {
  const ids = (value ?? '').split(',').filter(Boolean);
  return [...new Set(ids)];
}

export function playerTag(player: Player): string {
  if (player.isGuest) return 'guest';
  if (player.isActive === false) return 'inactive';
  return '';
}

// ---------- stat table ----------

interface StatRow {
  label: string;
  sub?: string;
  hasInfo?: boolean;
  better: 'high' | 'low';
  /** Shows the group rank when one player is selected. */
  rankable: boolean;
  value: (totals: PlayerTotals) => number;
  format: (totals: PlayerTotals) => string;
  /** False when the stat can't be worked out for this player (shown as '–'). Default: they played. */
  hasValue?: (totals: PlayerTotals) => boolean;
}

function rowHasValue(row: StatRow, totals: PlayerTotals): boolean {
  return totals.games > 0 && (row.hasValue?.(totals) ?? true);
}

const STAT_ROWS: StatRow[] = [
  {
    label: 'Games', better: 'high', rankable: true,
    value: totals => totals.games,
    format: totals => `${totals.games}`,
  },
  {
    label: 'Goals', better: 'high', rankable: true,
    value: totals => totals.goals,
    format: totals => `${totals.goals}`,
  },
  {
    label: 'Goals/game', better: 'high', rankable: true,
    value: totals => ratio(totals.goals, totals.games),
    format: totals => ratio(totals.goals, totals.games).toFixed(2),
  },
  {
    label: 'Wins', better: 'high', rankable: true,
    value: totals => totals.wins,
    format: totals => `${totals.wins}`,
  },
  {
    label: 'Losses', better: 'low', rankable: false,
    value: totals => totals.loses,
    format: totals => `${totals.loses}`,
  },
  {
    label: 'Win %', better: 'high', rankable: true,
    value: totals => percentOf(totals.wins, totals.games),
    format: totals => `${percentOf(totals.wins, totals.games)}%`,
  },
  {
    label: 'Avg performance', sub: 'per game day', hasInfo: true, better: 'high', rankable: true,
    value: totals => roundTo(totals.avgPerformance, 1),
    format: totals => totals.avgPerformance.toFixed(1),
  },
  {
    label: 'Clean sheets', better: 'high', rankable: true,
    value: totals => totals.cleanSheets,
    format: totals => `${totals.cleanSheets}`,
  },
  {
    label: 'Conceded/game', better: 'low', rankable: true,
    value: totals => roundTo(ratio(totals.goalsConceded, totals.scoredGames), 1),
    format: totals => ratio(totals.goalsConceded, totals.scoredGames).toFixed(1),
    hasValue: totals => totals.scoredGames > 0,
  },
  {
    label: 'Own goals', better: 'low', rankable: true,
    value: totals => totals.ownGoals,
    format: totals => `${totals.ownGoals}`,
  },
];

export interface StatTableRow {
  label: string;
  sub: string;
  hasInfo: boolean;
  cells: { text: string; isBest: boolean; rank: string }[];
}

/** 1 + the number of group players who did better. */
function rankInGroup(row: StatRow, value: number, groupTotals: PlayerTotals[]): number {
  const betterCount = groupTotals
    .filter(totals => rowHasValue(row, totals))
    .filter(totals => row.better === 'high' ? row.value(totals) > value : row.value(totals) < value)
    .length;
  return 1 + betterCount;
}

/**
 * One row per stat, one cell per selected player.
 * Comparing: the best value is highlighted. One player: the cell shows their rank in the group.
 */
export function buildStatTableRows(selectedTotals: PlayerTotals[], groupTotals: PlayerTotals[]): StatTableRow[] {
  const isComparing = selectedTotals.length > 1;
  return STAT_ROWS.map(row => {
    const hasValue = selectedTotals.map(totals => rowHasValue(row, totals));
    const values = selectedTotals.map(row.value);
    const knownValues = values.filter((_, index) => hasValue[index]);
    const bestValue = row.better === 'high' ? Math.max(...knownValues) : Math.min(...knownValues);
    const shouldHighlight = isComparing && new Set(knownValues).size > 1;
    const showRank = !isComparing && row.rankable;
    return {
      label: row.label,
      sub: row.sub ?? '',
      hasInfo: !!row.hasInfo,
      cells: selectedTotals.map((totals, index) => ({
        text: hasValue[index] ? row.format(totals) : '–',
        isBest: shouldHighlight && hasValue[index] && values[index] === bestValue,
        rank: showRank && hasValue[index] ? `#${rankInGroup(row, values[index], groupTotals)}` : '',
      })),
    };
  });
}

// ---------- performance explainer ----------

export interface PerformanceExample {
  title: string;
  lines: { label: string; points: string; isZero: boolean }[];
  total: string;
}

function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : `${points}`;
}

function pointsLine(count: number, singular: string, pointsEach: number, pluralForm?: string) {
  const points = count * pointsEach;
  return {
    label: `${plural(count, singular, pluralForm)} × ${pointsEach}`,
    points: formatPoints(points),
    isZero: points === 0,
  };
}

/** A worked example from the player's latest game day in `dates`. Empty (no title) if they didn't play. */
export function buildPerformanceExample(
  playerName: string, statsByDate: Map<string, Statistics>, dates: string[],
): PerformanceExample {
  const latestDate = [...dates].reverse().find(date => (statsByDate.get(date)?.games ?? 0) > 0);
  const stats = latestDate ? statsByDate.get(latestDate) : undefined;
  if (!latestDate || !stats) return {title: '', lines: [], total: ''};
  return {
    title: `${playerName}, ${formatDay(latestDate, spansMultipleYears(dates))}: ${plural(stats.games, 'match', 'matches')}`,
    lines: [
      pointsLine(stats.goals, 'goal', PERFORMANCE_POINTS.goal),
      pointsLine(stats.wins, 'win', PERFORMANCE_POINTS.win),
      pointsLine(stats.draws, 'draw', PERFORMANCE_POINTS.draw),
      pointsLine(stats.cleanSheets, 'clean sheet', PERFORMANCE_POINTS.cleanSheet),
      pointsLine(stats.ownGoals, 'own goal', PERFORMANCE_POINTS.ownGoal),
    ],
    total: `${calculatePerformance(stats)}`,
  };
}

// ---------- chart ----------

function dayValue(stats: Statistics, stat: ChartStat): number {
  if (stat === 'goals') return stats.goals;
  if (stat === 'wins') return stats.wins;
  if (stat === 'winPct') return percentOf(stats.wins, stats.games);
  return calculatePerformance(stats);
}

/** One point per game day: the value that day, or null on days the player missed. */
function dailySeries(statsByDate: Map<string, Statistics>, dates: string[], stat: ChartStat): (number | null)[] {
  return dates.map(date => {
    const stats = statsByDate.get(date);
    if (!stats || stats.games === 0) return null;
    return dayValue(stats, stat);
  });
}

/** Running totals for goals/wins, running averages for Win % and Performance. */
function cumulativeSeries(statsByDate: Map<string, Statistics>, dates: string[], stat: ChartStat): (number | null)[] {
  const runningTotals = emptyStatistics();
  let gameDays = 0;
  let performanceSum = 0;
  return dates.map(date => {
    const stats = statsByDate.get(date);
    if (stats && stats.games > 0) {
      runningTotals.goals += stats.goals;
      runningTotals.wins += stats.wins;
      runningTotals.games += stats.games;
      performanceSum += calculatePerformance(stats);
      gameDays++;
    }
    if (stat === 'goals') return runningTotals.goals;
    if (stat === 'wins') return runningTotals.wins;
    if (!gameDays) return null;
    if (stat === 'winPct') return percentOf(runningTotals.wins, runningTotals.games);
    return roundTo(performanceSum / gameDays, 1);
  });
}

export function buildChartDataset(
  player: Player, color: string, statsByDate: Map<string, Statistics>, dates: string[], stat: ChartStat, mode: ChartMode,
): ChartDataset<'line', (number | null)[]> {
  const data = mode === 'day' ? dailySeries(statsByDate, dates, stat) : cumulativeSeries(statsByDate, dates, stat);
  return {
    label: player.name,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.5,
    pointRadius: dates.length > 20 ? 2 : 3.5,
    pointHoverRadius: 6,
    tension: 0.25,
    spanGaps: true,
  };
}

export function buildChartOptions(stat: ChartStat): ChartOptions<'line'> {
  const isPercent = stat === 'winPct';
  const suffix = isPercent ? '%' : '';
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: context => {
            const valueText = context.parsed.y === null ? 'did not play' : context.parsed.y + suffix;
            return ` ${context.dataset.label}: ${valueText}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
      y: {
        beginAtZero: true,
        suggestedMax: isPercent ? 100 : undefined,
        ticks: { precision: 0, callback: value => `${value}${suffix}` },
      },
    },
  };
}

const STAT_DESCRIPTIONS: Record<ChartStat, string> = {
  goals: 'goals scored',
  wins: 'matches won',
  winPct: '% of matches won',
  performance: 'performance score',
};

export function buildChartCaption(stat: ChartStat, mode: ChartMode): string {
  const statDescription = STAT_DESCRIPTIONS[stat];
  if (mode === 'day') {
    return `Each point is the player's ${statDescription} on that game day. Days they didn't play are skipped and the line joins across them.`;
  }
  const flatNote = 'The line stays flat on days the player missed.';
  if (stat === 'winPct') {
    return `Each point is the running win %: all wins ÷ all matches played, from the start of the range up to that game day. ${flatNote}`;
  }
  if (stat === 'performance') {
    return `Each point is the running average of game-day performance scores, from the start of the range up to that game day. ${flatNote}`;
  }
  return `Each point is the total ${statDescription} from the start of the range up to that game day. ${flatNote}`;
}

// ---------- head to head ----------

function sharePercent(part: number, whole: number): number {
  return ratio(part, whole) * 100;
}

/** Bar widths and legend texts for the two players' head-to-head card. */
export function buildHeadToHeadView(firstPlayer: Player, secondPlayer: Player, matches: MatchSummary[]) {
  const { together, against } = countHeadToHead(matches, firstPlayer.id, secondPlayer.id);
  return {
    together: {
      label: `${plural(together.matches, 'match', 'matches')} · ${together.wins}-${together.draws}-${together.losses}`,
      wonText: `${together.wins} won`,
      drawnText: `${together.draws} drawn`,
      lostText: `${together.losses} lost`,
      wonPercent: sharePercent(together.wins, together.matches),
      drawnPercent: sharePercent(together.draws, together.matches),
      lostPercent: sharePercent(together.losses, together.matches),
    },
    against: {
      label: plural(against.matches, 'match', 'matches'),
      firstPlayerText: `${firstPlayer.name} ${against.firstPlayerWins}`,
      drawsText: plural(against.draws, 'draw'),
      secondPlayerText: `${secondPlayer.name} ${against.secondPlayerWins}`,
      firstPlayerPercent: sharePercent(against.firstPlayerWins, against.matches),
      drawsPercent: sharePercent(against.draws, against.matches),
      secondPlayerPercent: sharePercent(against.secondPlayerWins, against.matches),
      firstPlayerColor: PLAYER_COLORS[0],
      secondPlayerColor: PLAYER_COLORS[1],
    },
  };
}
