import { MatchRecord, MatchStatus } from '../../models/match-event.model';
import { buildMatchDay, matchDayKey } from './match-day.util';

function match(id: string, status: MatchStatus, date: Date): MatchRecord {
  return { id, status, createdBy: 'test', createdAt: { seconds: date.getTime() / 1000 } };
}

describe('match day', () => {
  const monday = new Date(2026, 10, 23, 20, 0);
  const mondayLater = new Date(2026, 10, 23, 22, 30);
  const tuesday = new Date(2026, 10, 24, 20, 0);

  it('groups the completed and day-voided matches of the same day', () => {
    const matches = [
      match('a', 'completed', monday),
      { ...match('b', 'voided', mondayLater), voidedBy: 'day' as const },
      match('c', 'abandoned', monday),
      match('d', 'completed', tuesday),
    ];
    const day = buildMatchDay(matches, matchDayKey(matches[0])!);
    expect(day.completedMatchIds).toEqual(['a']);
    expect(day.voidedMatchIds).toEqual(['b']);
    expect(day.hasLiveMatch).toBeFalse();
  });

  it('only restores matches voided by the day action', () => {
    const voidedByDay = { ...match('a', 'voided', monday), winner: 'team1', loser: 'team2', voidedBy: 'day' as const };
    const voidedOnItsOwn = { ...match('b', 'voided', mondayLater), winner: 'team1', loser: 'team2' };
    const day = buildMatchDay([voidedByDay, voidedOnItsOwn], matchDayKey(voidedByDay)!);
    expect(day.voidedMatchIds).toEqual(['a']);
  });

  it('notices a live match on that day', () => {
    const matches = [match('a', 'completed', monday), match('b', 'live', mondayLater)];
    expect(buildMatchDay(matches, matchDayKey(matches[0])!).hasLiveMatch).toBeTrue();
  });

  it('has no day for a match without a date', () => {
    expect(matchDayKey({ status: 'live', createdBy: 'test' })).toBeNull();
    expect(matchDayKey(null)).toBeNull();
  });
});
