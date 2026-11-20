export interface BalanceMeter {
  level: 'even' | 'close' | 'lopsided';
  word: string;
  gap: string;
  fill: number;     // bar width in %
  uneven: boolean;  // teams have different sizes
}

/**
 * How fair the teams look, from each team's player count and total rating (teams with players only).
 * Different team sizes are flagged first: averages can't be compared then (6 players at 5.4 beat 4 at 5.25).
 * Same sizes: the gap between the best and worst average rating.
 */
export function computeBalanceMeter(teams: { count: number; totalRating: number }[]): BalanceMeter | null {
  const filled = teams.filter(team => team.count > 0);
  if (filled.length < 2) return null;

  const sizes = filled.map(team => team.count);
  if (Math.max(...sizes) !== Math.min(...sizes)) {
    return { level: 'lopsided', word: `Uneven: ${sizes.join(' v ')}`, gap: '', fill: 8, uneven: true };
  }

  const averages = filled.map(team => team.totalRating / team.count);
  const gap = Math.max(...averages) - Math.min(...averages);
  const level = gap < 0.3 ? 'even' : gap < 0.8 ? 'close' : 'lopsided';
  const word = level === 'even' ? 'Even' : level === 'close' ? 'Close' : 'Lopsided';
  return { level, word, gap: gap.toFixed(2), fill: Math.max(8, 100 - Math.min(gap / 2, 1) * 92), uneven: false };
}
