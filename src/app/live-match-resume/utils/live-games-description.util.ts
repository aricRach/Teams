import { MatchEventRecord, MatchRecord } from '../../match-event-manager/models/match-event.model';
import { computeGoalTally } from '../../match-event-manager/utils/scoring.util';
import { teamDisplayName } from '../../utils/team-label.util';
import { startedAtMs } from './resumable-matches.util';

export interface LiveGame {
  match: MatchRecord;
  events: MatchEventRecord[];
}

/**
 * One line per game, e.g. "Team A vs Team B · 2–1 · started 20:14 by dan@mail.com". HTML, for the confirm modal.
 * A game someone else started may still be running on their device, so that's said too.
 */
export function describeLiveGames(liveGames: LiveGame[], aliases: Record<string, string>, currentUser: string): string {
  return liveGames.map(({ match, events }) => {
    const [homeTeam, awayTeam] = match.teamKeys ?? [];
    const score = computeGoalTally(events, match.teamKeys);
    const startTime = new Date(startedAtMs(match)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const line = `${teamDisplayName(homeTeam, aliases[homeTeam])} vs ${teamDisplayName(awayTeam, aliases[awayTeam])}`
      + ` · ${score[homeTeam]}–${score[awayTeam]} · started ${startTime} by ${match.createdBy}`;
    const otherDeviceWarning = match.createdBy !== currentUser
      ? '<br><strong>Started by someone else - it may still be running on their device.</strong>'
      : '';
    return escapeHtml(line) + otherDeviceWarning;
  }).join('<br>');
}

// Team names are typed by users and the modal renders HTML.
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
