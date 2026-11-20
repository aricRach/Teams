import { MatchSummary } from './match-summary.util';

/** Most matches won in a row, per player. A draw or a loss ends the streak. */
export function longestWinStreaks(matches: MatchSummary[]): Map<string, number> {
  const currentStreaks = new Map<string, number>();
  const bestStreaks = new Map<string, number>();
  for (const match of matches) {
    for (const playerId of match.winners) {
      const streak = match.isDraw ? 0 : (currentStreaks.get(playerId) ?? 0) + 1;
      currentStreaks.set(playerId, streak);
      bestStreaks.set(playerId, Math.max(bestStreaks.get(playerId) ?? 0, streak));
    }
    for (const playerId of match.losers) currentStreaks.set(playerId, 0);
  }
  return bestStreaks;
}

/** Match-winning goals per player. */
export function countWinningGoals(matches: MatchSummary[]): Map<string, number> {
  const winningGoals = new Map<string, number>();
  for (const match of matches) {
    const scorerId = match.winningGoalPlayerId;
    if (scorerId) winningGoals.set(scorerId, (winningGoals.get(scorerId) ?? 0) + 1);
  }
  return winningGoals;
}

export interface DuoRecord {
  matches: number;
  wins: number;
}

/** Matches and wins for every pair that played on the same team. Key: the two ids sorted, joined by ','. */
export function duoRecords(matches: MatchSummary[]): Map<string, DuoRecord> {
  const records = new Map<string, DuoRecord>();
  for (const match of matches) {
    for (const [teamPlayerIds, won] of [[match.winners, !match.isDraw], [match.losers, false]] as const) {
      for (let i = 0; i < teamPlayerIds.length; i++) {
        for (let j = i + 1; j < teamPlayerIds.length; j++) {
          const key = [teamPlayerIds[i], teamPlayerIds[j]].sort().join(',');
          const record = records.get(key) ?? { matches: 0, wins: 0 };
          record.matches++;
          if (won) record.wins++;
          records.set(key, record);
        }
      }
    }
  }
  return records;
}
