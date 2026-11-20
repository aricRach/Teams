import { Statistics } from '../../players/models/player.model';
import { calculatePerformance } from './performance.util';

/** A player's stats added up over several game days. */
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
