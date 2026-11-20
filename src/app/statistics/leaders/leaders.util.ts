import { Player } from '../../players/models/player.model';
import {
  countWinningGoals, duoRecords, longestWinStreaks, MatchSummary, percentOf, PlayerTotals, plural, ratio, roundTo,
} from '../utils/player-insights.util';

/** Rate cards (win %, defender, duo, performance) only count players with enough matches. */
const MIN_SHARE_FOR_PLAYER = 0.25;
const MIN_SHARE_FOR_DUO = 0.15;

export interface LeaderEntry {
  playerIds: string[];
  name: string;
  value: number;
  valueText: string;
  sub?: string;
}

export interface LeaderCardContent {
  title: string;
  description: string;
  entries: LeaderEntry[];
  better: 'high' | 'low';
}

export interface PlayerWithTotals {
  player: Player;
  totals: PlayerTotals;
}

/** At least `share` of `total`, and at least 1. */
function minimumCount(total: number, share: number): number {
  return Math.max(1, Math.ceil(total * share));
}

function playerEntry(player: Player, value: number, valueText: string | number, sub?: string): LeaderEntry {
  return { playerIds: [player.id], name: player.name, value, valueText: `${valueText}`, sub };
}

/** A card where the value is a plain count; players with 0 are left out. */
function countEntries(playersWithTotals: PlayerWithTotals[], getCount: (playerWithTotals: PlayerWithTotals) => number): LeaderEntry[] {
  return playersWithTotals
    .map(playerWithTotals => {
      const count = getCount(playerWithTotals);
      return playerEntry(playerWithTotals.player, count, count);
    })
    .filter(entry => entry.value > 0);
}

function buildDuoEntries(players: Player[], matches: MatchSummary[], minDuoMatches: number) {
  const playersById = new Map(players.map(player => [player.id, player]));
  const pairs = [...duoRecords(matches).entries()]
    .map(([key, record]) => ({ playerIds: key.split(','), record }))
    .filter(({ playerIds }) => playerIds.every(id => playersById.has(id)));
  const pairName = (playerIds: string[]) => playerIds.map(id => playersById.get(id)!.name).join(' & ');

  const mostMatchesTogether: LeaderEntry[] = pairs.map(({ playerIds, record }) => ({
    playerIds,
    name: pairName(playerIds),
    value: record.matches,
    valueText: `${record.matches}`,
    sub: `${record.wins} won`,
  }));

  const bestWinPercent: LeaderEntry[] = pairs
    .filter(({ record }) => record.matches >= minDuoMatches)
    .map(({ playerIds, record }) => {
      const winPercent = percentOf(record.wins, record.matches);
      return {
        playerIds,
        name: pairName(playerIds),
        value: winPercent,
        valueText: `${winPercent}%`,
        sub: `${record.wins} of ${record.matches}`,
      };
    });

  return { mostMatchesTogether, bestWinPercent };
}

/**
 * Every leader card with all its candidates (not ranked yet).
 * `playersWithTotals` holds only players who played in the range.
 */
export function buildLeaderCards(
  players: Player[], playersWithTotals: PlayerWithTotals[], matches: MatchSummary[], gameDayCount: number,
): LeaderCardContent[] {
  const matchCount = matches.length;
  const minMatches = minimumCount(matchCount, MIN_SHARE_FOR_PLAYER);
  const minDuoMatches = minimumCount(matchCount, MIN_SHARE_FOR_DUO);
  const minGameDays = minimumCount(gameDayCount, MIN_SHARE_FOR_PLAYER);

  const regulars = playersWithTotals.filter(({ totals }) => totals.games >= minMatches);
  const winningGoals = countWinningGoals(matches);
  const winStreaks = longestWinStreaks(matches);
  const duos = buildDuoEntries(players, matches, minDuoMatches);
  const regularsNote = `Only players who played at least ${minMatches} of the ${matchCount} matches.`;

  const card = (title: string, description: string, entries: LeaderEntry[], better: 'high' | 'low' = 'high'): LeaderCardContent =>
    ({ title, description, entries, better });

  return [
    card('Top scorer', 'Most goals',
      countEntries(playersWithTotals, ({ totals }) => totals.goals)),

    card('Match winner', 'Most match-winning goals: the goal that put the team ahead for good',
      countEntries(playersWithTotals, ({ player }) => winningGoals.get(player.id) ?? 0)),

    card('Most wins', 'Most matches won',
      playersWithTotals
        .map(({ player, totals }) => playerEntry(player, totals.wins, totals.wins, `of ${totals.games}`))
        .filter(entry => entry.value > 0)),

    card('Best win %', `Highest win %. ${regularsNote}`,
      regulars.map(({ player, totals }) => {
        const winPercent = percentOf(totals.wins, totals.games);
        return playerEntry(player, winPercent, `${winPercent}%`, `${totals.wins} of ${totals.games}`);
      })),

    card('Best defender', `Fewest goals conceded per match. ${regularsNote}`,
      // Per match with a saved score, since only those count goals conceded.
      playersWithTotals
        .filter(({ totals }) => totals.scoredGames >= minMatches)
        .map(({ player, totals }) => {
          const concededPerMatch = roundTo(ratio(totals.goalsConceded, totals.scoredGames), 2);
          return playerEntry(player, concededPerMatch, concededPerMatch.toFixed(2), `${totals.goalsConceded} in ${totals.scoredGames}`);
        }),
      'low'),

    card('Clean sheet king', 'Most matches with 0 conceded',
      countEntries(playersWithTotals, ({ totals }) => totals.cleanSheets)),

    card('Iron man', 'Most matches played',
      playersWithTotals.map(({ player, totals }) =>
        playerEntry(player, totals.games, totals.games, plural(totals.gameDays, 'game day')))),

    card('Best duo', `Highest win % on the same team. Only pairs who played at least ${minDuoMatches} matches together.`,
      duos.bestWinPercent),

    card('Inseparable', 'The pair who played the most matches on the same team',
      duos.mostMatchesTogether),

    card('Top performer', `Best avg performance per game day. Only players who came to at least ${minGameDays} of the ${gameDayCount} game days.`,
      playersWithTotals
        .filter(({ totals }) => totals.gameDays >= minGameDays)
        .map(({ player, totals }) => {
          const avgPerformance = roundTo(totals.avgPerformance, 1);
          return playerEntry(player, avgPerformance, avgPerformance.toFixed(1));
        })),

    card('Longest win streak', 'Most matches won in a row',
      playersWithTotals
        .map(({ player }) => {
          const streak = winStreaks.get(player.id) ?? 0;
          return playerEntry(player, streak, streak, 'in a row');
        })
        .filter(entry => entry.value > 0)),
  ];
}
