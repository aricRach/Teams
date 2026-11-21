import {Player} from '../../players/models/player.model';
import {compactName} from './player-name.util';

/** Inactive guests whose name contains the search, names that start with it first. */
export function matchingGuests(inactiveGuests: Player[], search: string): Player[] {
  const query = compactName(search);
  const byName = (a: Player, b: Player) => a.name.localeCompare(b.name);
  if (!query) return [...inactiveGuests].sort(byName);
  const startsWithQuery = (player: Player) => compactName(player.name).startsWith(query) ? 0 : 1;
  return inactiveGuests
    .filter(guest => compactName(guest.name).includes(query))
    .sort((a, b) => startsWithQuery(a) - startsWithQuery(b) || byName(a, b));
}
