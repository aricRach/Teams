import {Player} from '../../players/models/player.model';

/** Names compared without case or spaces, so "Dan Cohen", "dan cohen " and "dancohen" are the same name. */
export function compactName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

/** How a new player's name is stored: trimmed, lowercase, single spaces. */
export function storedName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The player who already has this name, if any. */
export function findPlayerByName(players: Player[], name: string): Player | undefined {
  const query = compactName(name);
  return query ? players.find(player => compactName(player.name) === query) : undefined;
}
