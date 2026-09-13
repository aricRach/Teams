export const TEAM_ALIAS_MAX_LENGTH = 20;

export interface TeamColorOption {
  name: string;
  /** A CSS `background` value - a solid hex for most options, or a gradient
   *  (e.g. for "Multicolor"). Stored as-is in `teamColors` and fed straight
   *  into a CSS custom property, so either kind renders the same way. */
  value: string;
}

/** The "Multicolor" option's value - a gradient, not a solid hex. Exported so
 *  consumers can detect it (`isMulticolorTeamColor`) and only reach for the
 *  riskier gradient-text CSS technique for this one entry, keeping every
 *  solid color on the simple, always-visible `color: var(--team-color)` path. */
export const TEAM_MULTICOLOR_VALUE =
  'conic-gradient(#e6194b, #f58231, #ffe119, #3cb44b, #42d4f4, #4363d8, #911eb4, #ff878d, #e6194b)';

export function isMulticolorTeamColor(value?: string | null): boolean {
  return value === TEAM_MULTICOLOR_VALUE;
}

/** Curated, visually-distinct colors an admin can assign to a team. Kept small and
 *  fixed (rather than a free-form picker) so two teams can never end up with colors
 *  too similar to tell apart at a glance. */
export const TEAM_COLOR_PALETTE: TeamColorOption[] = [
  { name: 'Crimson', value: '#e6194b' },
  { name: 'Emerald', value: '#3cb44b' },
  { name: 'Yellow', value: '#ffe119' },
  { name: 'Cobalt', value: '#4363d8' },
  { name: 'Tangerine', value: '#f58231' },
  { name: 'Violet', value: '#911eb4' },
  { name: 'Tulip', value: '#ff878d' },
  { name: 'Cyan', value: '#42d4f4' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Multicolor', value: TEAM_MULTICOLOR_VALUE },
];

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
