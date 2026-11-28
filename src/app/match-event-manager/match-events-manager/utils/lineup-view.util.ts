import { Player } from '../../../players/models/player.model';
import { MatchLineups } from './match-lineup.util';

export interface LineupView {
  teamKey: string;
  label: string;
  players: { id: string; name: string }[];
  addOptions: Player[];
}

// One chip row per team. The add options are the candidates who aren't in either lineup yet.
export function buildLineupViews(
  lineups: MatchLineups,
  addCandidates: Player[],
  teamLabelOf: (teamKey: string) => string,
  playerNameOf: (playerId: string) => string
): LineupView[] {
  const playerIdsInMatch = new Set(Object.values(lineups).flat());
  const addOptions = addCandidates
    .filter(player => !playerIdsInMatch.has(player.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return Object.entries(lineups).map(([teamKey, playerIds]) => ({
    teamKey,
    label: teamLabelOf(teamKey),
    players: playerIds.map(playerId => ({ id: playerId, name: playerNameOf(playerId) })),
    addOptions
  }));
}
