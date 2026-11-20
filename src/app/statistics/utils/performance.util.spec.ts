import { calculatePerformance } from './performance.util';
import { Statistics } from '../../players/models/player.model';

function makeStats(overrides: Partial<Statistics> = {}): Statistics {
  return {
    goals: 0,
    wins: 0,
    loses: 0,
    draws: 0,
    games: 0,
    goalsConceded: 0,
    scoredGames: 0,
    ownGoals: 0,
    cleanSheets: 0,
    ...overrides,
  };
}

describe('calculatePerformance', () => {
  it('weights goals at 2.5 points each', () => {
    expect(calculatePerformance(makeStats({ goals: 3 }))).toBe(7.5);
  });

  it('weights wins at 1.5 points each', () => {
    expect(calculatePerformance(makeStats({ wins: 2 }))).toBe(3);
  });

  it('weights draws at 1 point each', () => {
    expect(calculatePerformance(makeStats({ draws: 2 }))).toBe(2);
  });

  it('contributes 0 for losses and goals conceded', () => {
    expect(calculatePerformance(makeStats({ loses: 4, goalsConceded: 9 }))).toBe(0);
  });

  it('gives 1 point per clean sheet', () => {
    expect(calculatePerformance(makeStats({ cleanSheets: 3 }))).toBe(3);
  });

  it('subtracts 2 points per own goal', () => {
    expect(calculatePerformance(makeStats({ ownGoals: 2 }))).toBe(-4);
  });

  it('adds up all factors for a game day', () => {
    const stats = makeStats({ goals: 2, wins: 3, draws: 1, cleanSheets: 2, ownGoals: 1 });
    // 2*2.5 + 3*1.5 + 1 + 2 - 2 = 5 + 4.5 + 1 + 2 - 2 = 10.5
    expect(calculatePerformance(stats)).toBe(10.5);
  });
});
