import { MatchLineups } from './match-lineup.util';

/** A lineup player as the goal pickers need it: `team` is the team they played for in this match. */
export interface RosterPlayer {
  id: string;
  name: string;
  team: string;
}

// Everyone in the lineups, each once, for crediting goals.
export function buildRosterPlayers(
  lineups: MatchLineups,
  playerNameOf: (playerId: string) => string
): RosterPlayer[] {
  const seen = new Set<string>();
  const roster: RosterPlayer[] = [];
  for (const [teamKey, playerIds] of Object.entries(lineups)) {
    for (const playerId of playerIds) {
      if (seen.has(playerId)) continue;
      seen.add(playerId);
      roster.push({ id: playerId, name: playerNameOf(playerId), team: teamKey });
    }
  }
  return roster;
}
