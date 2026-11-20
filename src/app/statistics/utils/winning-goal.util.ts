import { MatchEventRecord, MatchRecord } from '../../match-event-manager/models/match-event.model';
import { isScoringEvent } from '../../match-event-manager/utils/scoring.util';

/** A Firestore Timestamp or a Date, in ms. 0 when missing. */
function timestampMs(value: any): number {
  if (value instanceof Date) return value.getTime();
  return (value?.seconds ?? 0) * 1000 + (value?.nanoseconds ?? 0) / 1e6;
}

/**
 * When the goal happened, in ms since kickoff. Every goal gets one value in the same unit, so the order is always consistent:
 * the exact timer time, else its minute (0 = the first minute), else an estimate from when it was saved.
 * The timer time keeps a goal added later in Manage Events in its real place.
 */
function goalTimeMs(goal: MatchEventRecord, kickoffMs: number): number {
  const timerMs = goal.payload?.['timerMs'];
  if (typeof timerMs === 'number') return timerMs;
  if (goal.minute != null) return goal.minute * 60_000;
  return timestampMs(goal.createdAt) - kickoffMs;
}

/** Goals in match order; two goals at the same time keep the order they were saved in. */
function sortGoalsByTime(goals: MatchEventRecord[], match: MatchRecord): MatchEventRecord[] {
  const kickoffMs = timestampMs(match.startedAt ?? match.createdAt);
  return [...goals].sort((first, second) =>
    goalTimeMs(first, kickoffMs) - goalTimeMs(second, kickoffMs)
    || timestampMs(first.createdAt) - timestampMs(second.createdAt)
  );
}

/**
 * The winner's (loser score + 1)th goal: after it, the other team never caught up.
 * Null when the logged goals don't match the saved score, because then we can't tell which goal it was.
 */
export function winningGoalPlayerId(match: MatchRecord, events: MatchEventRecord[]): string | null {
  if (match.gameStatus === 'draw' || !match.winner) return null;
  const goals = sortGoalsByTime(events.filter(event => isScoringEvent(event) && event.teamKey), match);
  const winnerGoals = goals.filter(goal => goal.teamKey === match.winner);
  const loserGoalCount = goals.length - winnerGoals.length;

  const winnerScore = match.wonTeamScore ?? winnerGoals.length;
  const loserScore = match.loseTeamScore ?? loserGoalCount;
  const goalsMatchScore = winnerGoals.length === winnerScore && loserGoalCount === loserScore;
  if (!goalsMatchScore) return null;

  const decisiveGoal = winnerGoals[loserScore];
  return decisiveGoal?.type === 'player_goal' ? decisiveGoal.playerId ?? null : null;
}
