import { MatchRecord } from '../../match-event-manager/models/match-event.model';
import { computeStandings, StandingsRow } from '../../game/league-standings/standings.util';
import { formatDateToString } from '../../utils/date-utils';

/** A league day only crowns a champion with enough matches and teams. */
const MIN_MATCHES_FOR_CHAMPIONSHIP = 3;
const MIN_TEAMS_FOR_CHAMPIONSHIP = 2;
/** A player needs this many matches for the winning team that day to share its championship. */
const MIN_MATCHES_FOR_CHAMPION = 2;

/** One date of league matches that counted for a championship. */
export interface LeagueDay {
  dateKey: string;
  /** Players with enough matches for the 1st-place team(s); level teams are co-champions. */
  championIds: string[];
  /** Everyone who played a league match that day. */
  playerIds: string[];
}

export interface ChampionshipRecord {
  championships: number;
  leagueDays: number;
}

function isLevel(first: StandingsRow, second: StandingsRow): boolean {
  return first.points === second.points && first.goalDiff === second.goalDiff && first.goalsFor === second.goalsFor;
}

/** Players who played at least MIN_MATCHES_FOR_CHAMPION matches for `teamKey`, so a short guest spell doesn't earn a title. */
function championsOfTeam(matches: MatchRecord[], teamKey: string): string[] {
  const matchCountByPlayer = new Map<string, number>();
  for (const match of matches) {
    const teamPlayerIds = match.winner === teamKey ? match.winnerPlayerIds : match.loser === teamKey ? match.loserPlayerIds : [];
    for (const playerId of teamPlayerIds ?? []) {
      matchCountByPlayer.set(playerId, (matchCountByPlayer.get(playerId) ?? 0) + 1);
    }
  }
  return [...matchCountByPlayer.entries()]
    .filter(([, matchCount]) => matchCount >= MIN_MATCHES_FOR_CHAMPION)
    .map(([playerId]) => playerId);
}

function buildLeagueDay(dateKey: string, matches: MatchRecord[]): LeagueDay | null {
  const standings = computeStandings(matches);
  if (matches.length < MIN_MATCHES_FOR_CHAMPIONSHIP || standings.length < MIN_TEAMS_FOR_CHAMPIONSHIP) return null;

  const championTeams = standings.filter(row => isLevel(row, standings[0])).map(row => row.teamKey);
  const championIds = new Set(championTeams.flatMap(teamKey => championsOfTeam(matches, teamKey)));
  const playerIds = new Set(matches.flatMap(match => [...(match.winnerPlayerIds ?? []), ...(match.loserPlayerIds ?? [])]));
  return { dateKey, championIds: [...championIds], playerIds: [...playerIds] };
}

/** Every date whose completed league matches crowned a champion. */
export function buildLeagueDays(matches: MatchRecord[]): LeagueDay[] {
  const matchesByDate = new Map<string, MatchRecord[]>();
  for (const match of matches) {
    if (match.mode !== 'league' || match.status !== 'completed' || !match.winner || !match.loser || !match.createdAt?.seconds) continue;
    const dateKey = formatDateToString(new Date(match.createdAt.seconds * 1000));
    const dayMatches = matchesByDate.get(dateKey);
    if (dayMatches) dayMatches.push(match); else matchesByDate.set(dateKey, [match]);
  }
  return [...matchesByDate.entries()]
    .map(([dateKey, dayMatches]) => buildLeagueDay(dateKey, dayMatches))
    .filter((leagueDay): leagueDay is LeagueDay => leagueDay !== null);
}

/** The league days on one of `dates`. */
export function leagueDaysOnDates(leagueDays: LeagueDay[], dates: string[]): LeagueDay[] {
  const dateSet = new Set(dates);
  return leagueDays.filter(leagueDay => dateSet.has(leagueDay.dateKey));
}

/** Championships won and league days played, per player. */
export function countChampionships(leagueDays: LeagueDay[]): Map<string, ChampionshipRecord> {
  const records = new Map<string, ChampionshipRecord>();
  const recordFor = (playerId: string) => {
    if (!records.has(playerId)) records.set(playerId, { championships: 0, leagueDays: 0 });
    return records.get(playerId)!;
  };
  for (const leagueDay of leagueDays) {
    for (const playerId of leagueDay.playerIds) recordFor(playerId).leagueDays++;
    for (const playerId of leagueDay.championIds) recordFor(playerId).championships++;
  }
  return records;
}
