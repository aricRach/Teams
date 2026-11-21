import {Player} from '../../players/models/player.model';

/** Bench players whose name contains the search; everyone when the search is empty. */
export function filterBenchByName(players: Player[], search: string): Player[] {
  const query = search.trim().toLowerCase();
  return query ? players.filter(player => player.name.toLowerCase().includes(query)) : players;
}
