const BENCH_KEY = 'allPlayers';

/**
 * How many teams the game page must show so every given team is visible.
 * Teams are shown in order, so showing teamC means showing 3 teams.
 */
export function countTeamsToShow(allTeamKeys: string[], teamKeysToShow: string[]): number {
  const orderedTeamKeys = allTeamKeys.filter(teamKey => teamKey !== BENCH_KEY);
  return Math.max(0, ...teamKeysToShow.map(teamKey => orderedTeamKeys.indexOf(teamKey) + 1));
}
