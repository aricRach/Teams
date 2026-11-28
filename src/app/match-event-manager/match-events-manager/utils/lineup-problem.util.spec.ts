import { MatchEventRecord } from '../../models/match-event.model';
import { findLineupProblem } from './lineup-problem.util';

const labelOf = (teamKey: string) => teamKey;
const nameOf = (playerId: string) => playerId;

function goal(playerId: string, teamKey: string, type: 'player_goal' | 'own_goal' = 'player_goal'): MatchEventRecord {
  return { type, playerId, playerNameSnapshot: playerId, teamKey, source: 'manual', createdBy: 'test' };
}

describe('findLineupProblem', () => {
  it('accepts lineups that match the goals', () => {
    const lineups = { A: ['p1', 'p2'], B: ['p3'] };
    const goals = [goal('p1', 'A'), goal('p3', 'A', 'own_goal')];
    expect(findLineupProblem(lineups, goals, true, labelOf, nameOf)).toBe('');
  });

  it('reports an empty team only in a completed match', () => {
    const lineups = { A: ['p1'], B: [] };
    expect(findLineupProblem(lineups, [], true, labelOf, nameOf)).toContain('B has no players');
    expect(findLineupProblem(lineups, [], false, labelOf, nameOf)).toBe('');
  });

  it('reports a player in both lineups', () => {
    const lineups = { A: ['p1', 'p3'], B: ['p3'] };
    expect(findLineupProblem(lineups, [], true, labelOf, nameOf)).toContain("p3 can't play for both teams");
  });

  it('reports a scorer moved to the other team', () => {
    const lineups = { A: ['p2'], B: ['p1', 'p3'] };
    expect(findLineupProblem(lineups, [goal('p1', 'A')], true, labelOf, nameOf)).toContain('p1 scored');
  });

  it('reports a removed scorer', () => {
    const lineups = { A: ['p2'], B: ['p3'] };
    expect(findLineupProblem(lineups, [goal('p1', 'A')], true, labelOf, nameOf)).toContain('p1 scored');
  });

  it('reports an own goal whose player is on the team it benefits', () => {
    const lineups = { A: ['p1'], B: ['p3'] };
    expect(findLineupProblem(lineups, [goal('p1', 'A', 'own_goal')], true, labelOf, nameOf)).toContain('p1 scored');
  });
});
