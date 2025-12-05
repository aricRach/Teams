import {Player} from '../models/player.model';
import {shuffleArray} from '../../utils/array-utils';
import {NotDividableError} from '../errors/not-dividable-error';

export const balancedTeamsSmallSize = (players: Player[], teamEntries: any, numberOfTeams: number) => {

  const groupSize = Math.floor(players.length / numberOfTeams);
  if (players.length % numberOfTeams !== 0) {
    throw new NotDividableError();
  }

  // Sort strongest → weakest (helps reach better solutions sooner)
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

  // Prepare groups
  const groups: Player[][] = Array.from({ length: numberOfTeams }, () => []);
  const sums = new Array(numberOfTeams).fill(0);

  let bestDiff = Infinity;
  let bestSolution: Player[][] = [];

  const backtrack = (index: number) => {
    if (index === sortedPlayers.length) {
      const maxSum = Math.max(...sums);
      const minSum = Math.min(...sums);
      const diff = maxSum - minSum;

      if (diff < bestDiff) {
        bestDiff = diff;
        bestSolution = groups.map(g => [...g]);
      }
      return;
    }

    const p = sortedPlayers[index];

    for (let g = 0; g < numberOfTeams; g++) {
      // Respect equal team sizes
      if (groups[g].length >= groupSize) continue;

      // Place player
      groups[g].push(p);
      sums[g] += p.rating;

      // No pruning at all — explore always
      backtrack(index + 1);

      // Undo
      groups[g].pop();
      sums[g] -= p.rating;
    }
  };

  // Run exhaustive search
  backtrack(0);

  // Build output map
  const teamMap: Record<string, { players: Player[]; totalRating: number }> = {};

  bestSolution.forEach((group, idx) => {
    const [teamKey] = teamEntries[idx];
    teamMap[teamKey] = {
      players: [...group],
      totalRating: group.reduce((sum, p) => sum + p.rating, 0)
    };
  });

  // Shuffle inside each team
  for (const teamKey in teamMap) {
    teamMap[teamKey].players = shuffleArray(teamMap[teamKey].players);
  }

  return teamMap;
};

// Give player to the weakest team
export const balanceTeams = (players: Player[], teamEntries: any, numberOfTeams: number) => {
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

  const teamMap: Record<string, { players: Player[], totalRating: number }> = {};
  // @ts-ignore
  teamEntries.forEach(([teamKey]) => {
    teamMap[teamKey] = { players: [], totalRating: 0 };
  });

  // Convert to array of objects so we can sort by totalRating easily
  const teams = teamEntries.map(([teamKey]: any) => ({
    key: teamKey,
    ref: teamMap[teamKey],
  }));

  for (const player of sortedPlayers) {
    teams.sort((a: any, b: any) => a.ref.totalRating - b.ref.totalRating);
    const team = teams[0].ref;
    team.players.push(player);
    team.totalRating += player.rating;
  }

  for (const teamKey in teamMap) {
    const currentTeam = teamMap[teamKey];
    currentTeam.players = shuffleArray(currentTeam.players);
  }

  return teamMap;
};
