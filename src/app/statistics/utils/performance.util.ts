import { Statistics } from '../../players/models/player.model';


/** The scoring rules of calculatePerformance, for display; keep it in sync with the function. */
export const PERFORMANCE_DESCRIPTION = [
  'Goal: +2',
  'Win: +1.5',
  'Draw: +1',
  'Conceded < 5: +3',
  'Own goal: -2',
].join('\n');

export function calculatePerformance(stats: Statistics): number {
  const cleanSheetBonus = stats.goalsConceded < 5 ? 3 : 0;
  return stats.goals * 2
    + stats.wins * 1.5
    + stats.draws
    + cleanSheetBonus
    - stats.ownGoals * 2;
}

export function averagePerformance(statsList: Statistics[]): number {
  const values = statsList
    .filter(stats => stats.games > 0)
    .map(calculatePerformance);

  if (!values.length) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}
