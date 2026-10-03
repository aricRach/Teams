import { MatchRecord } from '../../match-event-manager/models/match-event.model';

export interface StandingsRow {
  teamKey: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

/**
 * Build a league table from a pre-filtered list of completed matches
 * (caller decides the scope - one session, one day, ...).
 */
export function computeStandings(matches: MatchRecord[]): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();
  const ensure = (teamKey: string): StandingsRow => {
    if (!rows.has(teamKey)) {
      rows.set(teamKey, {
        teamKey, played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0
      });
    }
    return rows.get(teamKey)!;
  };

  for (const match of matches) {
    if (match.status !== 'completed' || !match.winner || !match.loser) continue;
    const winnerScore = match.wonTeamScore ?? 0;
    const loserScore = match.loseTeamScore ?? 0;
    const a = ensure(match.winner);
    const b = ensure(match.loser);
    a.played++; b.played++;
    a.goalsFor += winnerScore; a.goalsAgainst += loserScore;
    b.goalsFor += loserScore; b.goalsAgainst += winnerScore;
    if (match.gameStatus === 'draw') {
      a.drawn++; b.drawn++;
      a.points += 1; b.points += 1;
    } else {
      a.won++; a.points += 3;
      b.lost++;
    }
  }

  return [...rows.values()]
    .map(r => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }))
    .sort((x, y) =>
      y.points - x.points ||
      y.goalDiff - x.goalDiff ||
      y.goalsFor - x.goalsFor ||
      x.teamKey.localeCompare(y.teamKey)
    );
}
