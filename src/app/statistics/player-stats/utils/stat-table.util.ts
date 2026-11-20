import { PlayerTotals } from '../../utils/player-totals.util';
import { percentOf, ratio, roundTo } from '../../utils/stats-math.util';

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

function rowHasValue(row: StatRow, totals: PlayerTotals): boolean {
  return totals.games > 0 && (row.hasValue?.(totals) ?? true);
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
