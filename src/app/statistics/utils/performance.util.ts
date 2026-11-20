import { Statistics } from '../../players/models/player.model';

/** Points per event in a game-day performance score. */
export const PERFORMANCE_POINTS = {
  goal: 2.5,
  win: 1.5,
  draw: 1,
  cleanSheet: 1,
  ownGoal: -2,
};

/** The scoring rules, for display. */
export const PERFORMANCE_RULES = [
  { label: 'Goal', points: '+2.5' },
  { label: 'Win', points: '+1.5' },
  { label: 'Draw', points: '+1' },
  { label: 'Clean sheet (match with 0 conceded)', points: '+1' },
  { label: 'Own goal', points: '−2' },
];

/** Score for one game day: everything the player did in all their matches that day, added up. */
export function calculatePerformance(stats: Statistics): number {
  return stats.goals * PERFORMANCE_POINTS.goal
    + stats.wins * PERFORMANCE_POINTS.win
    + stats.draws * PERFORMANCE_POINTS.draw
    + (stats.cleanSheets || 0) * PERFORMANCE_POINTS.cleanSheet
    + stats.ownGoals * PERFORMANCE_POINTS.ownGoal;
}
