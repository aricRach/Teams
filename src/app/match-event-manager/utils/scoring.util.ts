import { MatchEventRecord } from '../models/match-event.model';

export const SCORING_EVENT_TYPES = ['player_goal', 'own_goal'] as const;

export function isScoringEvent(e: Pick<MatchEventRecord, 'type' | 'deletedAt'>): boolean {
  return !e.deletedAt && (SCORING_EVENT_TYPES as readonly string[]).includes(e.type);
}

export function isOwnGoalEvent(e: Pick<MatchEventRecord, 'type' | 'deletedAt'>): boolean {
  return !e.deletedAt && e.type === 'own_goal';
}

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
