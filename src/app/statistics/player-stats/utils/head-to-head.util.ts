import { MatchSummary } from '../../utils/match-summary.util';

export interface HeadToHead {
  together: { matches: number; wins: number; draws: number; losses: number };
  against: { matches: number; firstPlayerWins: number; draws: number; secondPlayerWins: number };
}

/** Matches the two players played on the same team, and against each other. */
export function countHeadToHead(matches: MatchSummary[], firstPlayerId: string, secondPlayerId: string): HeadToHead {
  const result: HeadToHead = {
    together: { matches: 0, wins: 0, draws: 0, losses: 0 },
    against: { matches: 0, firstPlayerWins: 0, draws: 0, secondPlayerWins: 0 },
  };
  for (const match of matches) {
    const firstWon = match.winners.includes(firstPlayerId);
    const firstLost = match.losers.includes(firstPlayerId);
    const secondWon = match.winners.includes(secondPlayerId);
    const secondLost = match.losers.includes(secondPlayerId);
    const bothPlayed = (firstWon || firstLost) && (secondWon || secondLost);
    if (!bothPlayed) continue;

    if (firstWon === secondWon) {
      result.together.matches++;
      if (match.isDraw) result.together.draws++;
      else if (firstWon) result.together.wins++;
      else result.together.losses++;
    } else {
      result.against.matches++;
      if (match.isDraw) result.against.draws++;
      else if (firstWon) result.against.firstPlayerWins++;
      else result.against.secondPlayerWins++;
    }
  }
  return result;
}
