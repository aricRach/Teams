export const TEAM_ALIAS_MAX_LENGTH = 20;

export interface TeamColorOption {
  name: string;
  value: string;
}

export const TEAM_MULTICOLOR_VALUE =
  'conic-gradient(#e6194b, #f58231, #ffe119, #3cb44b, #42d4f4, #4363d8, #911eb4, #ff878d, #e6194b)';

export function isMulticolorTeamColor(value?: string | null): boolean {
  return value === TEAM_MULTICOLOR_VALUE;
}

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

export function defaultTeamLetter(teamKey: string): string {
  return teamKey.replace(/^team/i, '').toUpperCase() || teamKey;
}

export function formatTeamLabel(teamKey: string, alias?: string | null): string {
  const letter = defaultTeamLetter(teamKey);
  const trimmed = alias?.trim();
  return trimmed ? `${letter}: ${trimmed}` : letter;
}
