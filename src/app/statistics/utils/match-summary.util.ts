import { MatchEventRecord, MatchRecord } from '../../match-event-manager/models/match-event.model';
import { formatDateToString } from '../../utils/date-utils';
import { winningGoalPlayerId } from './winning-goal.util';

/** What the insights need from one completed match: who was on which side, and the winning goal. */
export interface MatchSummary {
  dateKey: string;
  /** For a draw these are just the two sides. */
  winners: string[];
  losers: string[];
  isDraw: boolean;
  /** Scorer of the goal that put the winning team ahead for good; null for draws and own goals. */
  winningGoalPlayerId: string | null;
}

/** Completed matches, oldest first. */
export function buildMatchSummaries(matches: { match: MatchRecord; events: MatchEventRecord[] }[]): MatchSummary[] {
  return matches
    .filter(({ match }) => match.status === 'completed' && match.createdAt?.seconds)
    .sort((first, second) => first.match.createdAt.seconds - second.match.createdAt.seconds)
    .map(({ match, events }) => ({
      dateKey: formatDateToString(new Date(match.createdAt.seconds * 1000)),
      winners: match.winnerPlayerIds || [],
      losers: match.loserPlayerIds || [],
      isDraw: match.gameStatus === 'draw',
      winningGoalPlayerId: winningGoalPlayerId(match, events),
    }));
}

/** Only the matches played on one of `dates`. */
export function matchesOnDates(matches: MatchSummary[], dates: string[]): MatchSummary[] {
  const dateSet = new Set(dates);
  return matches.filter(match => dateSet.has(match.dateKey));
}
