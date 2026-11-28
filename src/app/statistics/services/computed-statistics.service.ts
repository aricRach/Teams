import {computed, inject, Injectable} from '@angular/core';
import {AllMatchDataService} from '../../match-event-manager/services/all-match-data.service';
import {Statistics} from '../../players/models/player.model';
import {compareDates, formatDateToString} from '../../utils/date-utils';
import {buildMatchSummaries, MatchSummary} from '../utils/match-summary.util';
import {buildLeagueDays, LeagueDay} from '../utils/championships.util';

@Injectable({providedIn: 'root'})
export class ComputedStatisticsService {
  private allMatchData = inject(AllMatchDataService);

  readonly isLoading = this.allMatchData.isInitialLoading;
  readonly hasError = this.allMatchData.hasError;

  reload(): void {
    this.allMatchData.reload();
  }

  /** Completed matches (who was on which side, winning goal), oldest first. */
  readonly matchSummaries = computed<MatchSummary[]>(() =>
    buildMatchSummaries(this.allMatchData.matchesWithEvents())
  );

  /** League days that crowned a champion, for the championships stat. */
  readonly leagueDays = computed<LeagueDay[]>(() =>
    buildLeagueDays(this.allMatchData.matchesWithEvents().map(({match}) => match))
  );

  readonly statsMap = computed<Map<string, Map<string, Statistics>>>(() => {
    const matchData = this.allMatchData.matchesWithEvents();
    const result = new Map<string, Map<string, Statistics>>();

    for (const {match, events} of matchData) {
      const dateKey = match.createdAt?.seconds
        ? formatDateToString(new Date(match.createdAt.seconds * 1000))
        : null;
      if (!dateKey) continue;

      const activeGoals = events.filter(event => event.type === 'player_goal' && !event.deletedAt);
      const activeOwnGoals = events.filter(event => event.type === 'own_goal' && !event.deletedAt);

      for (const goal of activeGoals) {
        if (goal.playerId) this.getOrInitStats(result, goal.playerId, dateKey).goals++;
      }

      // own_goal.playerId is the conceding player who scored into their own net.
      for (const ownGoal of activeOwnGoals) {
        if (ownGoal.playerId) this.getOrInitStats(result, ownGoal.playerId, dateKey).ownGoals++;
      }

      if (match.status === 'completed') {
        const isDraw = match.gameStatus === 'draw';
        for (const playerId of (match.winnerPlayerIds || [])) {
          const stats = this.getOrInitStats(result, playerId, dateKey);
          stats.games++;
          isDraw ? stats.draws++ : stats.wins++;
          this.addConceded(stats, match.loseTeamScore);
        }
        for (const playerId of (match.loserPlayerIds || [])) {
          const stats = this.getOrInitStats(result, playerId, dateKey);
          stats.games++;
          isDraw ? stats.draws++ : stats.loses++;
          this.addConceded(stats, match.wonTeamScore);
        }
      }

      for (const goal of activeGoals) {
        if (goal.playerId) {
          const stats = this.getOrInitStats(result, goal.playerId, dateKey);
          if (stats.games === 0) stats.games++;
        }
      }
    }

    return result;
  });

  statsForPlayer(playerId: string): Map<string, Statistics> {
    return this.statsMap().get(playerId) ?? new Map();
  }

  /** Goals conceded and clean sheet for one match. With no saved score neither is counted. */
  private addConceded(stats: Statistics, opponentScore: number | undefined) {
    if (opponentScore == null) return;
    stats.scoredGames++;
    stats.goalsConceded += opponentScore;
    if (opponentScore === 0) stats.cleanSheets++;
  }

  private getOrInitStats(
    result: Map<string, Map<string, Statistics>>,
    playerId: string,
    dateKey: string
  ): Statistics {
    if (!result.has(playerId)) result.set(playerId, new Map());
    const playerMap = result.get(playerId)!;
    if (!playerMap.has(dateKey)) {
      playerMap.set(dateKey, {goals: 0, wins: 0, loses: 0, draws: 0, games: 0, goalsConceded: 0, scoredGames: 0, ownGoals: 0, cleanSheets: 0});
    }
    return playerMap.get(dateKey)!;
  }

  allDatesWithActivity = computed<string[]>(() => {
    const dates = new Set<string>();
    for (const playerDateMap of this.statsMap().values()) {
      for (const [date, playerStats] of playerDateMap.entries()) {
        if (playerStats.games > 0) dates.add(date);
      }
    }
    return Array.from(dates).sort(compareDates);
  });
}
