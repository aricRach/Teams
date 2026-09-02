import { Player, Statistics } from '../players/models/player.model';

export interface TeamScores {
  attackScore: number;  // 0–100 normalised (best attacking team = 100)
  defenseScore: number; // 0–100 normalised (best defending team = 100)
}

export function computeTeamScores(
  teams: { [key: string]: { players: Player[] } },
  statsMap: Map<string, Map<string, Statistics>>,
): { [teamKey: string]: TeamScores } {
  const entries = Object.entries(teams).filter(([key]) => key !== 'allPlayers');

  const raw = entries.map(([key, team]) => ({
    key,
    ...rawStatsForTeam(team.players, statsMap),
  }));

  const maxAttack  = Math.max(...raw.map(r => r.rawAttack),  0.001);
  const maxDefense = Math.max(...raw.map(r => r.rawDefense), 0.001);

  const result: { [key: string]: TeamScores } = {};
  for (const { key, rawAttack, rawDefense, hasData } of raw) {
    result[key] = {
      attackScore:  hasData ? Math.round((rawAttack  / maxAttack)  * 100) : 0,
      defenseScore: hasData ? Math.round((1 - rawDefense / maxDefense) * 100) : 0,
    };
  }
  return result;
}

function rawStatsForTeam(
  players: Player[],
  statsMap: Map<string, Map<string, Statistics>>,
): { rawAttack: number; rawDefense: number; hasData: boolean } {
  let sumAttack = 0;
  let sumDefense = 0;
  let count = 0;

  for (const p of players) {
    const playerDateMap = statsMap.get(p.id);
    if (!playerDateMap) continue;

    let totalGoals = 0;
    let totalConceded = 0;
    let totalGames = 0;

    for (const s of playerDateMap.values()) {
      totalGoals    += s.goals         ?? 0;
      totalConceded += s.goalsConceded ?? 0;
      totalGames    += s.games         ?? 0;
    }

    if (totalGames > 0) {
      sumAttack  += totalGoals    / totalGames;
      sumDefense += totalConceded / totalGames;
      count++;
    }
  }

  return count > 0
    ? { rawAttack: sumAttack / count, rawDefense: sumDefense / count, hasData: true }
    : { rawAttack: 0, rawDefense: 0, hasData: false };
}
