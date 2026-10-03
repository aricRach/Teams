import { averagePerformance, calculatePerformance } from './performance.util';
import { Statistics } from '../../players/models/player.model';

function makeStats(overrides: Partial<Statistics> = {}): Statistics {
  return {
    goals: 0,
    wins: 0,
    loses: 0,
    draws: 0,
    games: 0,
    goalsConceded: 0,
    ownGoals: 0,
    ...overrides,
  };
}

describe('calculatePerformance', () => {
  it('weights goals at 2 points each', () => {
    expect(calculatePerformance(makeStats({ goals: 3 }))).toBe(6 + 3); // + clean-ish-sheet bonus
  });

  it('weights wins at 1.5 points each', () => {
    expect(calculatePerformance(makeStats({ wins: 2 }))).toBe(3 + 3);
  });

  it('weights draws at 1 point each', () => {
    expect(calculatePerformance(makeStats({ draws: 2 }))).toBe(2 + 3);
  });

  it('contributes 0 for losses', () => {
    expect(calculatePerformance(makeStats({ loses: 4 }))).toBe(3);
  });

  it('grants a clean-ish-sheet bonus when goalsConceded is under 5', () => {
    expect(calculatePerformance(makeStats({ goalsConceded: 4 }))).toBe(3);
  });

  it('withholds the clean-ish-sheet bonus at exactly 5 conceded', () => {
    expect(calculatePerformance(makeStats({ goalsConceded: 5 }))).toBe(0);
  });

  it('withholds the clean-ish-sheet bonus above 5 conceded', () => {
    expect(calculatePerformance(makeStats({ goalsConceded: 8 }))).toBe(0);
  });

  it('subtracts 2 points per own goal', () => {
    expect(calculatePerformance(makeStats({ ownGoals: 2 }))).toBe(3 - 4);
  });

  it('combines all factors for a realistic day', () => {
    const stats = makeStats({ goals: 2, wins: 1, draws: 0, goalsConceded: 2, ownGoals: 1 });
    // 2*2 + 1*1.5 + 0*1 + 3 (bonus) - 1*2 = 4 + 1.5 + 3 - 2 = 6.5
    expect(calculatePerformance(stats)).toBe(6.5);
  });
});

describe('averagePerformance', () => {
  it('returns 0 for an empty list', () => {
    expect(averagePerformance([])).toBe(0);
  });

  it('ignores dates with no games played', () => {
    const stats = [makeStats({ games: 0, goals: 10 })];
    expect(averagePerformance(stats)).toBe(0);
  });

  it('averages calculatePerformance across the played dates', () => {
    const stats = [
      makeStats({ games: 1, wins: 1 }), // 1.5 + 3 (bonus) = 4.5
      makeStats({ games: 1, goals: 1 }), // 2 + 3 (bonus) = 5
    ];
    expect(averagePerformance(stats)).toBe(4.75);
  });

  it('rounds to 2 decimal places', () => {
    const stats = [
      makeStats({ games: 1, wins: 1 }), // 4.5
      makeStats({ games: 1, wins: 0 }), // 3 (bonus only)
      makeStats({ games: 1, draws: 1 }), // 4 (1 + 3 bonus)
    ];
    expect(averagePerformance(stats)).toBe(3.83);
  });
});
