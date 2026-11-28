import { MatchEventRecord } from '../../models/match-event.model';
import { MatchLineups } from './match-lineup.util';

// Why the lineups of a match can't be saved, or '' when they can.
// Empty teams only matter in a completed match.
export function findLineupProblem(
  lineups: MatchLineups,
  goalEvents: MatchEventRecord[],
  isCompleted: boolean,
  teamLabelOf: (teamKey: string) => string,
  playerNameOf: (playerId: string) => string
): string {
  const teamKeys = Object.keys(lineups);

  const emptyTeam = teamKeys.find(teamKey => lineups[teamKey].length === 0);
  if (emptyTeam && isCompleted) {
    return `${teamLabelOf(emptyTeam)} has no players. Add who played for them.`;
  }

  const teamCountByPlayer = new Map<string, number>();
  for (const playerId of teamKeys.flatMap(teamKey => lineups[teamKey])) {
    teamCountByPlayer.set(playerId, (teamCountByPlayer.get(playerId) ?? 0) + 1);
  }
  const inBothTeams = [...teamCountByPlayer].filter(([, count]) => count > 1).map(([playerId]) => playerNameOf(playerId));
  if (inBothTeams.length) {
    return `${inBothTeams.join(', ')} can't play for both teams. Remove them from one of the lineups.`;
  }

  const misplacedScorers = scorersInWrongLineup(lineups, goalEvents);
  if (misplacedScorers.length) {
    const isOrAre = misplacedScorers.length === 1 ? "isn't" : "aren't";
    return `${misplacedScorers.join(', ')} scored in this match but ${isOrAre} in the lineup of the team they scored for. ` +
      'Fix the lineup, or change or remove the goal.';
  }
  return '';
}

// A goal's scorer must be in the lineup of the team the goal counts for. An own goal's `teamKey` is the team
// that benefits, so the player who conceded it must be in the other team's lineup.
function scorersInWrongLineup(lineups: MatchLineups, goalEvents: MatchEventRecord[]): string[] {
  const lineupSets = new Map(Object.entries(lineups).map(([teamKey, playerIds]) => [teamKey, new Set(playerIds)]));
  const names = new Set<string>();
  for (const event of goalEvents) {
    if (!event.playerId || !event.teamKey) continue;
    const scoringTeam = lineupSets.get(event.teamKey);
    if (!scoringTeam) continue; // a goal for a team not in this match: the goal tally check reports it
    const isInRightLineup = event.type === 'own_goal'
      ? [...lineupSets].some(([teamKey, players]) => teamKey !== event.teamKey && players.has(event.playerId!))
      : scoringTeam.has(event.playerId);
    if (!isInRightLineup) names.add(event.playerNameSnapshot ?? 'Unknown player');
  }
  return [...names];
}
