import {Player} from '../../players/models/player.model';
import {averageRating} from '../../utils/team-rating.util';

/** A new guest's rating when none is typed: the regulars' average (one decimal), else everyone's, else 5. */
export function defaultGuestRating(activePlayers: Player[]): number {
  const regulars = activePlayers.filter(player => !player.isGuest);
  const average = averageRating(regulars.length ? regulars : activePlayers);
  return Math.round(average * 10) / 10 || 5;
}
