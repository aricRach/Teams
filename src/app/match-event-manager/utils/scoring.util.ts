import { MatchEventRecord } from '../models/match-event.model';

/**
 * Event types that count toward a team's score. A `player_goal` is credited to the
 * scorer's own team; an `own_goal` is credited to the *beneficiary* team (its
 * `teamKey` is already the team whose score goes up), so both are tallied the same way.
 */
export const SCORING_EVENT_TYPES = ['player_goal', 'own_goal'] as const;

/** A non-deleted goal or own goal. */
export function isScoringEvent(e: Pick<MatchEventRecord, 'type' | 'deletedAt'>): boolean {
  return !e.deletedAt && (SCORING_EVENT_TYPES as readonly string[]).includes(e.type);
}

/** True for a non-deleted `own_goal` event. */
export function isOwnGoalEvent(e: Pick<MatchEventRecord, 'type' | 'deletedAt'>): boolean {
  return !e.deletedAt && e.type === 'own_goal';
}

/**
 * teamKey -> goal count over `player_goal` + `own_goal` events (own_goal.teamKey is
 * the beneficiary team). Pass `teamKeys` to seed zero entries and ignore any event
 * whose teamKey is outside that set.
 */
export function computeGoalTally(events: MatchEventRecord[], teamKeys?: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (teamKeys) for (const k of teamKeys) out[k] = 0;
  for (const e of events) {
    if (!isScoringEvent(e) || !e.teamKey) continue;
    if (teamKeys && !teamKeys.includes(e.teamKey)) continue;
    out[e.teamKey] = (out[e.teamKey] ?? 0) + 1;
  }
  return out;
}
