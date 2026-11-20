import {Player} from '../players/models/player.model';

export function totalRating(players: Player[]): number {
  return players.reduce((sum, player) => sum + (player.rating || 0), 0);
}

export function averageRating(players: Player[]): number {
  return players.length ? totalRating(players) / players.length : 0;
}
