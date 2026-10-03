import { TeamLabelPipe } from './team-label.pipe';

describe('TeamLabelPipe', () => {
  const pipe = new TeamLabelPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('falls back to the letter when no alias map is given', () => {
    expect(pipe.transform('teamA')).toBe('A');
    expect(pipe.transform('teamB', null)).toBe('B');
  });

  it('uses the alias for the given key', () => {
    expect(pipe.transform('teamA', { teamA: 'Rockets', teamB: 'Sharks' })).toBe('A: Rockets');
  });

  it('falls back to the letter when the key has no alias', () => {
    expect(pipe.transform('teamC', { teamA: 'Rockets' })).toBe('C');
  });
});
