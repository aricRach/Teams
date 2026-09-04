export const TEAM_ALIAS_MAX_LENGTH = 20;

/** The default single-letter label for a team slot key, e.g. "teamA" -> "A". */
export function defaultTeamLetter(teamKey: string): string {
  return teamKey.replace(/^team/i, '').toUpperCase() || teamKey;
}

/**
 * Display label for a team: the slot letter, plus the group's custom nickname
 * when one is set. e.g. "teamA" -> "A", or "teamA" + "Rockets" -> "A: Rockets".
 * The slot key itself is never changed - it stays the team's identity.
 */
export function formatTeamLabel(teamKey: string, alias?: string | null): string {
  const letter = defaultTeamLetter(teamKey);
  const trimmed = alias?.trim();
  return trimmed ? `${letter}: ${trimmed}` : letter;
}
