import { Player } from '../players/models/player.model';

type TeamsMap = { [key: string]: { players: Player[] } };

/**
 * Game-screen view transform: a game board only shows the first
 * `visibleTeamCount` team slots. Any player sitting in a slot beyond that (e.g.
 * `teamD` when the admin picked 3 teams for the night) is shown in the shared
 * `allPlayers` pool instead of vanishing into a hidden team.
 *
 * Pure - returns a shallow-cloned map with fresh `players` arrays; the input is
 * not mutated. Team-slot order follows the object's own key order (the skeleton:
 * teamA, teamB, teamC, teamD).
 */
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

  // Groups that never stored an `allPlayers` slot still need one for the pool.
  if (!result['allPlayers']) {
    result['allPlayers'] = { players: hiddenPlayers };
  }
  return result;
}
