import { Statistics } from '../../../players/models/player.model';
import { calculatePerformance, PERFORMANCE_POINTS } from '../../utils/performance.util';
import { formatDay, plural, spansMultipleYears } from '../../utils/stats-format.util';

/** The worked example in "How performance is calculated". */
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
  if (!latestDate || !stats) return { title: '', lines: [], total: '' };
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
