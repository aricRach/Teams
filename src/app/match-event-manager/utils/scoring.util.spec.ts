import { MatchEventRecord } from '../models/match-event.model';
import { computeGoalTally, isOwnGoalEvent, isScoringEvent } from './scoring.util';

function ev(partial: Partial<MatchEventRecord>): MatchEventRecord {
  return { type: 'player_goal', source: 'manual', createdBy: 'tester', ...partial } as MatchEventRecord;
}

describe('isScoringEvent', () => {
  it('is true for a live player_goal and own_goal', () => {
    expect(isScoringEvent(ev({ type: 'player_goal' }))).toBe(true);
    expect(isScoringEvent(ev({ type: 'own_goal' }))).toBe(true);
  });

  it('is false for non-scoring event types', () => {
    for (const type of ['match_started', 'match_ended', 'team_result', 'stat_correction', 'player_assist', 'custom'] as const) {
      expect(isScoringEvent(ev({ type }))).toBe(false);
    }
  });

  it('is false for a soft-deleted goal', () => {
    expect(isScoringEvent(ev({ type: 'player_goal', deletedAt: { seconds: 1 } }))).toBe(false);
    expect(isScoringEvent(ev({ type: 'own_goal', deletedAt: { seconds: 1 } }))).toBe(false);
  });
});

describe('isOwnGoalEvent', () => {
  it('matches only a live own_goal', () => {
    expect(isOwnGoalEvent(ev({ type: 'own_goal' }))).toBe(true);
    expect(isOwnGoalEvent(ev({ type: 'player_goal' }))).toBe(false);
    expect(isOwnGoalEvent(ev({ type: 'own_goal', deletedAt: { seconds: 1 } }))).toBe(false);
  });
});

describe('computeGoalTally', () => {
  it('counts player_goal events per teamKey', () => {
    const events = [
      ev({ type: 'player_goal', teamKey: 'teamA' }),
      ev({ type: 'player_goal', teamKey: 'teamA' }),
      ev({ type: 'player_goal', teamKey: 'teamB' }),
    ];
    expect(computeGoalTally(events)).toEqual({ teamA: 2, teamB: 1 });
  });

  it('adds own_goal to the beneficiary team (its teamKey), not the conceding team', () => {
    // player on teamA scored into their own net -> teamB benefits
    const events = [
      ev({ type: 'player_goal', teamKey: 'teamA' }),
      ev({ type: 'own_goal', teamKey: 'teamB', playerId: 'a1' }),
    ];
    expect(computeGoalTally(events, ['teamA', 'teamB'])).toEqual({ teamA: 1, teamB: 1 });
  });

  it('sums goals and own goals for the same beneficiary team', () => {
    const events = [
      ev({ type: 'player_goal', teamKey: 'teamB' }),
      ev({ type: 'own_goal', teamKey: 'teamB' }),
    ];
    expect(computeGoalTally(events)).toEqual({ teamB: 2 });
  });

  it('ignores soft-deleted events', () => {
    const events = [
      ev({ type: 'player_goal', teamKey: 'teamA' }),
      ev({ type: 'player_goal', teamKey: 'teamA', deletedAt: { seconds: 1 } }),
      ev({ type: 'own_goal', teamKey: 'teamB', deletedAt: { seconds: 1 } }),
    ];
    expect(computeGoalTally(events, ['teamA', 'teamB'])).toEqual({ teamA: 1, teamB: 0 });
  });

  it('excludes events whose teamKey is outside the provided teamKeys', () => {
    const events = [
      ev({ type: 'player_goal', teamKey: 'teamA' }),
      ev({ type: 'player_goal', teamKey: 'teamC' }),
    ];
    expect(computeGoalTally(events, ['teamA', 'teamB'])).toEqual({ teamA: 1, teamB: 0 });
  });
});
