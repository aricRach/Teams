import { defaultTeamLetter, formatTeamLabel } from './team-label.util';

describe('team-label.util', () => {
  describe('defaultTeamLetter', () => {
    it('turns a slot key into its letter', () => {
      expect(defaultTeamLetter('teamA')).toBe('A');
      expect(defaultTeamLetter('teamD')).toBe('D');
    });

    it('returns the key unchanged when it has no "team" prefix', () => {
      expect(defaultTeamLetter('allPlayers')).toBe('ALLPLAYERS');
    });
  });

  describe('formatTeamLabel', () => {
    it('returns just the letter when there is no alias', () => {
      expect(formatTeamLabel('teamA')).toBe('A');
      expect(formatTeamLabel('teamB', null)).toBe('B');
      expect(formatTeamLabel('teamC', '')).toBe('C');
    });

    it('returns "letter: alias" when an alias is set', () => {
      expect(formatTeamLabel('teamA', 'Rockets')).toBe('A: Rockets');
    });

    it('ignores a whitespace-only alias', () => {
      expect(formatTeamLabel('teamA', '   ')).toBe('A');
    });

    it('trims the alias', () => {
      expect(formatTeamLabel('teamA', '  Rockets  ')).toBe('A: Rockets');
    });
  });
});
