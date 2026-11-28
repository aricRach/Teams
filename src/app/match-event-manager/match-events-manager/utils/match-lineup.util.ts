import { MatchRecord } from '../../models/match-event.model';
import { Player } from '../../../players/models/player.model';

/** The ids of the players who played in a match, per team key. */
export type MatchLineups = Record<string, string[]>;

// The players on a team on the team board, used as a guess for a team with no saved lineup.
export function boardLineup(boardPlayers: Player[], teamKey: string): string[] {
  return boardPlayers.filter(player => player.team === teamKey).map(player => player.id);
}

// The lineups saved on the match. Only ended matches have them: a live, reset or very old match has none.
export function savedLineups(match: MatchRecord): MatchLineups {
  const lineups: MatchLineups = {};
  if (match.winner && match.winnerPlayerIds) lineups[match.winner] = [...match.winnerPlayerIds];
  if (match.loser && match.loserPlayerIds) lineups[match.loser] = [...match.loserPlayerIds];
  return lineups;
}
