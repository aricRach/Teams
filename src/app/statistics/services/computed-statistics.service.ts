import {computed, inject, Injectable} from '@angular/core';
import {AllMatchDataService} from '../../match-event-manager/services/all-match-data.service';
import {Statistics} from '../../players/models/player.model';
import {compareDates, formatDateToString} from '../../utils/date-utils';

@Injectable({providedIn: 'root'})
export class ComputedStatisticsService {
  private allMatchData = inject(AllMatchDataService);

  readonly statsMap = computed<Map<string, Map<string, Statistics>>>(() => {
    const matchData = this.allMatchData.matchesWithEvents();
    const result = new Map<string, Map<string, Statistics>>();

    for (const {match, events} of matchData) {
      const dateKey = match.createdAt?.seconds
        ? formatDateToString(new Date(match.createdAt.seconds * 1000))
        : null;
      if (!dateKey) continue;

      const activeGoals = events.filter(event => event.type === 'player_goal' && !event.deletedAt);

      for (const goal of activeGoals) {
        if (goal.playerId) this.getOrInitStats(result, goal.playerId, dateKey).goals++;
      }

      if (match.status === 'completed') {
        const isDraw = match.gameStatus === 'draw';
        for (const playerId of (match.winnerPlayerIds || [])) {
          const stats = this.getOrInitStats(result, playerId, dateKey);
          stats.games++;
          isDraw ? stats.draws++ : stats.wins++;
          stats.goalsConceded += (match.loseTeamScore || 0);
        }
        for (const playerId of (match.loserPlayerIds || [])) {
          const stats = this.getOrInitStats(result, playerId, dateKey);
          stats.games++;
          isDraw ? stats.draws++ : stats.loses++;
          stats.goalsConceded += (match.wonTeamScore || 0);
        }
      }

      // Scorers not in any roster still count as having played (preserves existing edge-case logic)
      for (const goal of activeGoals) {
        if (goal.playerId) {
          const stats = this.getOrInitStats(result, goal.playerId, dateKey);
          if (stats.games === 0) stats.games++;
        }
      }

      for (const correctionEvent of events) {
        if (correctionEvent.type === 'stat_correction' && !correctionEvent.deletedAt && correctionEvent.payload?.['playerId']) {
          const correctionPlayerId = correctionEvent.payload['playerId'] as string;
          const correctionDelta = correctionEvent.payload['delta'] as Partial<Statistics>;
          const correctionDateKey = (correctionEvent.payload['dateKey'] as string) || dateKey;
          const correctionStats = this.getOrInitStats(result, correctionPlayerId, correctionDateKey);
          for (const statKey of Object.keys(correctionDelta) as (keyof Statistics)[]) {
            if (correctionDelta[statKey] !== undefined) {
              correctionStats[statKey] = Math.max(0, (correctionStats[statKey] || 0) + (correctionDelta[statKey] || 0));
            }
          }
        }
      }
    }

    return result;
  });

  statsForPlayer(playerId: string): Map<string, Statistics> {
    return this.statsMap().get(playerId) ?? new Map();
  }

  private getOrInitStats(
    result: Map<string, Map<string, Statistics>>,
    playerId: string,
    dateKey: string
  ): Statistics {
    if (!result.has(playerId)) result.set(playerId, new Map());
    const playerMap = result.get(playerId)!;
    if (!playerMap.has(dateKey)) {
      playerMap.set(dateKey, {goals: 0, wins: 0, loses: 0, draws: 0, games: 0, goalsConceded: 0});
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
