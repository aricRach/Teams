import { Player } from '../players/models/player.model';

type TeamsMap = { [key: string]: { players: Player[] } };

export function collapseExtraTeams(teams: TeamsMap, visibleTeamCount: number): TeamsMap {
  if (!teams) return teams;

  const teamKeys = Object.keys(teams).filter((key) => key !== 'allPlayers');
  const hiddenKeys = new Set(teamKeys.slice(Math.max(0, visibleTeamCount)));
  if (hiddenKeys.size === 0) {
    return teams;
  }

  const hiddenPlayers: Player[] = [];
  for (const key of hiddenKeys) {
    hiddenPlayers.push(...teams[key].players);
  }

  const result: TeamsMap = {};
  for (const [key, value] of Object.entries(teams)) {
    if (key === 'allPlayers') {
      result[key] = { players: [...value.players, ...hiddenPlayers] };
    } else if (hiddenKeys.has(key)) {
      result[key] = { players: [] };
    } else {
      result[key] = { players: [...value.players] };
    }
  }

  if (!result['allPlayers']) {
    result['allPlayers'] = { players: hiddenPlayers };
  }
  return result;
}

/**
 * Undoes `collapseExtraTeams` after the collapsed view was edited: hidden teams get their players back,
 * except the ones that were dragged from the unassigned list into a visible team.
 */
export function restoreHiddenTeams(boardTeams: TeamsMap, savedTeams: TeamsMap, visibleTeamCount: number): TeamsMap {
  const teamKeys = Object.keys(savedTeams).filter((key) => key !== 'allPlayers');
  const hiddenTeamKeys = teamKeys.slice(Math.max(0, visibleTeamCount));
  if (hiddenTeamKeys.length === 0) {
    return boardTeams;
  }

  // On the board, hidden teams' players sit in the unassigned list.
  const unassignedOnBoard = boardTeams['allPlayers']?.players ?? [];
  const unassignedOnBoardIds = new Set(unassignedOnBoard.map((player) => player.id));
  const returnedPlayerIds = new Set<string>();
  const result: TeamsMap = { ...boardTeams };
  for (const teamKey of hiddenTeamKeys) {
    // The team's saved players, minus any that were dragged into a visible team.
    const playersBackInTeam = savedTeams[teamKey].players
      .filter((player) => unassignedOnBoardIds.has(player.id));
    playersBackInTeam.forEach((player) => returnedPlayerIds.add(player.id));
    result[teamKey] = { players: playersBackInTeam };
  }
  // They're back in their teams, so they're no longer unassigned.
  result['allPlayers'] = { players: unassignedOnBoard.filter((player) => !returnedPlayerIds.has(player.id)) };
  return result;
}
