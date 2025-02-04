import {Player} from '../players/models/player.model';

export interface Team {
  name: string;
  players: Player[];
  totalRating: number;
}
