import { MatchRecord } from '../../models/match-event.model';
import { formatDateToString } from '../../../utils/date-utils';

/** The matches of one day that can be voided (completed) or restored (voided by Void day). */
export interface MatchDay {
  dayKey: string;
  completedMatchIds: string[];
  voidedMatchIds: string[];
  hasLiveMatch: boolean;
}

// The day a match was played, as the statistics group it (dd-mm-yyyy), or null when it has no date.
export function matchDayKey(match: MatchRecord | null): string | null {
  return match?.createdAt?.seconds ? formatDateToString(new Date(match.createdAt.seconds * 1000)) : null;
}

export function buildMatchDay(matches: MatchRecord[], dayKey: string): MatchDay {
  const day: MatchDay = { dayKey, completedMatchIds: [], voidedMatchIds: [], hasLiveMatch: false };
  for (const match of matches) {
    if (!match.id || matchDayKey(match) !== dayKey) continue;
    if (match.status === 'completed') day.completedMatchIds.push(match.id);
    if (match.status === 'live') day.hasLiveMatch = true;
    // Only matches the day action voided come back. A match voided on its own (from the Edit form) stays voided.
    if (match.status === 'voided' && match.voidedBy === 'day') day.voidedMatchIds.push(match.id);
  }
  return day;
}
