import { MatchRecord } from '../../match-event-manager/models/match-event.model';
import { formatDateToString } from '../../utils/date-utils';

export interface SortedLiveMatches {
  /** At most one per slot, all from the same mode and league session. */
  resumable: MatchRecord[];
  /** Left behind (an earlier day, an older game on the same slot, another session): to be abandoned. */
  stale: MatchRecord[];
}

/**
 * Splits the group's live matches into the games that can be resumed and the ones left behind.
 * The game page has 2 slots, so at most 2 are resumed:
 * 1. Sort all live matches newest first.
 * 2. Keep the newest, if it started today and has a slot and two teamKeys.
 * 3. Keep each next match only if it also started today, its slot isn't taken yet,
 *    and it has the same mode and league session as the newest.
 * 4. Everything else is left behind, e.g. games from a refresh that were never resumed.
 */
export function sortLiveMatches(liveMatches: MatchRecord[], now: Date): SortedLiveMatches {
  const today = formatDateToString(now);
  const newestFirst = [...liveMatches].sort((first, second) => startedAtMs(second) - startedAtMs(first));
  const resumable: MatchRecord[] = [];
  const stale: MatchRecord[] = [];

  for (const match of newestFirst) {
    const newest = resumable[0];
    const canResume =
      formatDateToString(new Date(startedAtMs(match))) === today &&
      !!match.slot && match.teamKeys?.length === 2 &&
      (!newest || (match.mode === newest.mode && match.sessionId === newest.sessionId)) &&
      !resumable.some(resumableMatch => resumableMatch.slot === match.slot);
    if (canResume) {
      resumable.push(match);
    } else {
      stale.push(match);
    }
  }

  resumable.sort((first, second) => first.slot! - second.slot!);
  return { resumable, stale };
}

export function startedAtMs(match: MatchRecord): number {
  return match.startedAt?.toMillis?.() ?? 0;
}
