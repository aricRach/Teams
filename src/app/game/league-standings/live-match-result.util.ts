import { MatchRecord } from '../../match-event-manager/models/match-event.model';

// Turns a running game into a finished match with its current score,
// so the table can show what it would look like if the game ended now.
export function toLiveMatchResult(teamKeys: string[], score: Record<string, number>): MatchRecord | null {
  const [firstTeam, secondTeam] = teamKeys;
  if (!firstTeam || !secondTeam) return null;

  const firstScore = score[firstTeam] ?? 0;
  const secondScore = score[secondTeam] ?? 0;
  const firstWins = firstScore >= secondScore;

  return {
    status: 'completed',
    createdBy: '',
    winner: firstWins ? firstTeam : secondTeam,
    loser: firstWins ? secondTeam : firstTeam,
    wonTeamScore: Math.max(firstScore, secondScore),
    loseTeamScore: Math.min(firstScore, secondScore),
    gameStatus: firstScore === secondScore ? 'draw' : 'decided'
  };
}
