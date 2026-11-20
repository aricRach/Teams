import { Player } from '../../../players/models/player.model';

export const MAX_COMPARED_PLAYERS = 4;

/** One color per slot (1st-4th player), so two players from the same team still look different. */
export const PLAYER_COLORS = ['#00a383', '#3b6fd8', '#e07a2e', '#a64fc4'];

/** Comma-separated ids from the URL, without duplicates. */
export function parsePlayerIds(value: string | null): string[] {
  const ids = (value ?? '').split(',').filter(Boolean);
  return [...new Set(ids)];
}

/** Small tag next to a selected player's name. */
export function playerTag(player: Player): string {
  if (player.isGuest) return 'guest';
  if (player.isActive === false) return 'inactive';
  return '';
}
