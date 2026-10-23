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
