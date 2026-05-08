import { inject, Injectable, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { MatchEventsApiService } from './match-events-api.service';
import { PlayersService } from '../../players/players.service';
import { Player, Statistics } from '../../players/models/player.model';
import { AuditTrailService } from '../../audit-trail/services/audit-trail.service';
import { currentDate, formatDateToString } from '../../utils/date-utils';
import { PopupsService } from 'ui';
import { elapsedMsToGameMinute } from '../utils/timer-display';
import { MatchEventRecord, MatchRecord } from '../models/match-event.model';
import { firstValueFrom } from 'rxjs';

export interface GameDetails {
  gameStatus: GameStatus | null;
  winner: string;
  loser: string;
  wonTeamScore: number;
  loseTeamScore: number;
}

export enum GameStatus {
  Draw = 'draw',
  Decided = 'decided',
}

@Injectable({
  providedIn: 'root'
})
export class MatchEventsManagerService {
  private matchEventsApiService = inject(MatchEventsApiService);
  private playersService = inject(PlayersService);
  private auth = inject(Auth);
  private auditTrailService = inject(AuditTrailService);
  private popupsService = inject(PopupsService);

  /** Prefer email for readability in rules/audit; fall back to uid if email is missing. */
  getActorId(): string {
    const user = this.auth.currentUser;
    return user?.email ?? user?.uid ?? '';
  }

  /** Set when timer starts (FF on); cleared after end-game persist or timer reset. */
  readonly liveMatchId = signal<string | null>(null);


  /**
   * Call when stopwatch Start fires. Creates a `live` match once per session.
   */
  async onTimerStartedForMatch(): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    if (!selectedGroup?.id || this.liveMatchId()) {
      return;
    }

    try {
      const id = await this.matchEventsApiService.createMatch(selectedGroup.id, {
        status: 'live',
        startedAt: new Date(),
        createdBy: this.getActorId()
      });
      this.liveMatchId.set(id);
    } catch (e) {
      console.error('Failed to create live match:', e);
      this.popupsService.addErrorPopOut('Failed to start live match data sync.');
    }
  }

  /**
   * Persist a match event and apply the corresponding statistics update (event → stats only).
   */
  async addMatchEvent(
    groupId: string,
    matchId: string,
    event: Omit<MatchEventRecord, 'id'>
  ): Promise<string> {
    const eventId = await this.matchEventsApiService.addEvent(groupId, matchId, event);
    await this.applyStatisticsForMatchEvent(groupId, event);
    return eventId;
  }

  /**
   * Soft-delete an event and undo its statistics effect when applicable (e.g. remove a goal).
   */
  async removeMatchEventWithStatsSync(
    groupId: string,
    matchId: string,
    eventSnapshot: { id: string; type: string; playerId?: string; deletedAt?: unknown }
  ): Promise<void> {
    if (eventSnapshot.deletedAt) {
      return;
    }
    await this.matchEventsApiService.deleteEvent(groupId, matchId, eventSnapshot.id);
    await this.applyStatisticsForRemovedEvent(eventSnapshot);
  }

  private async applyStatisticsForMatchEvent(
    groupId: string,
    event: Omit<MatchEventRecord, 'id'>
  ): Promise<void> {
    switch (event.type) {
      case 'player_goal':
        if (event.playerId) {
          await this.playersService.adjustPlayerGoalsForDate(event.playerId, 1, currentDate);
        }
        break;

      case 'team_result': {
        const payload = event.payload as Record<string, unknown> | undefined;
        if (!payload?.['winner'] || !payload?.['loser'] || !payload?.['gameStatus']) {
          return;
        }
        const teams = this.playersService.getTeams();
        const winnerKey = payload['winner'] as string;
        const loserKey = payload['loser'] as string;
        const winners: Player[] = teams[winnerKey]?.players || [];
        const losers: Player[] = teams[loserKey]?.players || [];
        const gameDetails: GameDetails = {
          gameStatus: payload['gameStatus'] as GameDetails['gameStatus'],
          winner: winnerKey,
          loser: loserKey,
          wonTeamScore: Number(payload['wonTeamScore'] ?? 0),
          loseTeamScore: Number(payload['loseTeamScore'] ?? 0)
        };
        await this.matchEventsApiService.applyMatchResultToPlayerStatistics(
          groupId,
          winners,
          losers,
          gameDetails.gameStatus as 'draw' | 'decided',
          gameDetails.wonTeamScore,
          gameDetails.loseTeamScore
        );
        this.updateLocalTeamStats(gameDetails);
        break;
      }

      case 'player_assist':
        // No `assists` field on Statistics yet — add mapping when the schema supports it.
        break;

      case 'match_started':
      case 'match_ended':
      case 'custom':
      default:
        break;
    }
  }

  private async applyStatisticsForRemovedEvent(eventSnapshot: {
    type: string;
    playerId?: string;
  }): Promise<void> {
    if (eventSnapshot.type === 'player_goal' && eventSnapshot.playerId) {
      await this.playersService.adjustPlayerGoalsForDate(
        eventSnapshot.playerId,
        -1,
        currentDate
      );
    }
    // Reverting `team_result` would require subtracting wins/games/etc. for all players — not supported from UI yet.
  }

  async abandonLiveMatchOnReset(): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const id = this.liveMatchId();
    if (selectedGroup?.id && id) {
      try {
        // Find and rollback all recorded goals for the abandoned match
        const eventsObs = this.matchEventsApiService.getEvents(selectedGroup.id, id);
        const events = await firstValueFrom(eventsObs);

        for (const event of events) {
          if (!event.deletedAt && event.type === 'player_goal' && event.id) {
            await this.removeMatchEventWithStatsSync(selectedGroup.id, id, {
              id: event.id,
              type: event.type,
              playerId: event.playerId,
              deletedAt: event.deletedAt
            });
          }
        }

        await this.matchEventsApiService.updateMatch(selectedGroup.id, id, {
          status: 'abandoned',
          endedAt: new Date()
        });
      } catch (e) {
        console.error('Failed to rollback abandoned match events:', e);
      }
    }
    this.liveMatchId.set(null);
  }

  /**
   * Each +1 goal in the goal modal (FF on, during live match).
   */
  async recordPlayerGoalFromTimer(player: Player, teamKey: string, elapsedMs: number): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const matchId = this.liveMatchId();
    if (!selectedGroup?.id || !matchId) {
      this.popupsService.addErrorPopOut('Start the match timer first.');
      return;
    }

    const createdBy = this.getActorId();
    const minute = elapsedMsToGameMinute(elapsedMs);

    try {
      await this.addMatchEvent(selectedGroup.id, matchId, {
        type: 'player_goal',
        source: 'manual',
        createdBy,
        playerId: player.id,
        playerNameSnapshot: player.name,
        teamKey,
        minute,
        payload: {
          timerMs: elapsedMs
        }
      });
    } catch {
      this.popupsService.addErrorPopOut('Could not save goal event.');
    }
  }

  async endGameAndPersist(gameDetails: GameDetails): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    if (!selectedGroup?.id || !gameDetails.gameStatus) {
      return Promise.reject();
    }

    const createdBy = this.getActorId();
    if (!createdBy) {
      this.popupsService.addErrorPopOut('Sign in to save the match.');
      return Promise.reject();
    }

    const existingLiveId = this.liveMatchId();

    const teams = this.playersService.getTeams();
    const winnerPlayerIds = (teams[gameDetails.winner]?.players || []).map((player: Player) => player.id);
    const loserPlayerIds = (teams[gameDetails.loser]?.players || []).map((player: Player) => player.id);

    let matchId: string;

    if (existingLiveId) {
      matchId = existingLiveId;
      await this.matchEventsApiService.updateMatch(selectedGroup.id, matchId, {
        status: 'completed',
        winner: gameDetails.winner,
        loser: gameDetails.loser,
        wonTeamScore: gameDetails.wonTeamScore,
        loseTeamScore: gameDetails.loseTeamScore,
        winnerPlayerIds,
        loserPlayerIds,
        gameStatus: gameDetails.gameStatus,
        endedAt: new Date()
      });
      this.liveMatchId.set(null);
    } else {
      matchId = await this.matchEventsApiService.createMatch(selectedGroup.id, {
        status: 'completed',
        winner: gameDetails.winner,
        loser: gameDetails.loser,
        wonTeamScore: gameDetails.wonTeamScore,
        loseTeamScore: gameDetails.loseTeamScore,
        winnerPlayerIds,
        loserPlayerIds,
        gameStatus: gameDetails.gameStatus,
        endedAt: new Date(),
        createdBy
      });
    }

    await this.addMatchEvent(selectedGroup.id, matchId, {
      type: 'team_result',
      source: 'manual',
      createdBy,
      payload: {
        winner: gameDetails.winner,
        loser: gameDetails.loser,
        wonTeamScore: gameDetails.wonTeamScore,
        loseTeamScore: gameDetails.loseTeamScore,
        gameStatus: gameDetails.gameStatus
      }
    });

    if (gameDetails.gameStatus === 'decided') {
      this.auditTrailService.addAuditTrail(`winner: ${gameDetails.winner} - loser: ${gameDetails.loser}`);
    } else {
      this.auditTrailService.addAuditTrail(`draw: ${gameDetails.winner} - ${gameDetails.loser}`);
    }
  }

  private updateLocalTeamStats(gameDetails: GameDetails) {
    const teams = this.playersService.getTeams();
    const dateKey = currentDate; // todo: is it correct to use the current date?!! what if i want to edit old game.
    const shouldDraw = gameDetails.gameStatus === 'draw';
    const defaultStats: Statistics = { wins: 0, games: 0, draws: 0, goals: 0, loses: 0, goalsConceded: 0 };

    const winners: Player[] = teams[gameDetails.winner]?.players || [];
    const losers: Player[] = teams[gameDetails.loser]?.players || [];

    const updatedWinners = winners.map((player) => {
      const currentStats: Statistics = { ...defaultStats, ...player.statistics?.[dateKey] };
      return {
        ...player,
        statistics: {
          ...player.statistics,
          [dateKey]: {
            ...currentStats,
            wins: currentStats.wins + (shouldDraw ? 0 : 1),
            games: currentStats.games + 1,
            draws: currentStats.draws + (shouldDraw ? 1 : 0),
            goalsConceded: currentStats.goalsConceded + gameDetails.loseTeamScore
          }
        }
      };
    });

    const updatedLosers = losers.map((player) => {
      const currentStats: Statistics = { ...defaultStats, ...player.statistics?.[dateKey] };
      return {
        ...player,
        statistics: {
          ...player.statistics,
          [dateKey]: {
            ...currentStats,
            loses: currentStats.loses + (shouldDraw ? 0 : 1),
            games: currentStats.games + 1,
            draws: currentStats.draws + (shouldDraw ? 1 : 0),
            goalsConceded: currentStats.goalsConceded + gameDetails.wonTeamScore
          }
        }
      };
    });

    this.playersService.setTeams({
      ...teams,
      [gameDetails.winner]: { ...teams[gameDetails.winner], players: updatedWinners },
      [gameDetails.loser]: { ...teams[gameDetails.loser], players: updatedLosers }
    });
  }

  /**
   * Computes the absolute statistics a match state imparts on players.
   */
  private computePlayerStatsForMatch(
    match: MatchRecord,
    events: MatchEventRecord[]
  ): Map<string, Record<string, number>> {
    const stats = new Map<string, Record<string, number>>();
    const getStats = (playerId: string) => {
      if (!stats.has(playerId)) {
        stats.set(playerId, { games: 0, wins: 0, loses: 0, draws: 0, goals: 0, goalsConceded: 0 });
      }
      return stats.get(playerId)!;
    };

    const goals = events.filter((event) => event.type === 'player_goal' && !event.deletedAt);
    goals.forEach((goal) => {
      if (goal.playerId) {
        getStats(goal.playerId)['goals']++;
      }
    });

    if (match.status === 'completed') {
      const isDraw = match.gameStatus === 'draw';
      (match.winnerPlayerIds || []).forEach((playerId) => {
        const playerStats = getStats(playerId);
        playerStats['games']++;
        if (isDraw) playerStats['draws']++; else playerStats['wins']++;
        playerStats['goalsConceded'] += (match.loseTeamScore || 0);
      });
      (match.loserPlayerIds || []).forEach((playerId) => {
        const playerStats = getStats(playerId);
        playerStats['games']++;
        if (isDraw) playerStats['draws']++; else playerStats['loses']++;
        playerStats['goalsConceded'] += (match.wonTeamScore || 0);
      });
    }

    // Ensure scorers also count as having played a game (in case they weren't in winner/loser rosters)
    goals.forEach((goal) => {
      if (goal.playerId) {
        const playerStats = getStats(goal.playerId);
        if (playerStats['games'] === 0) {
          playerStats['games']++;
        }
      }
    });

    return stats;
  }

  /**
   * Reconciles changes between an old and a new match state, updating Firestore and stats atomically.
   */
  async reconcileMatch(
    groupId: string,
    matchId: string,
    oldMatch: MatchRecord,
    newMatch: MatchRecord,
    oldEvents: MatchEventRecord[],
    newEvents: MatchEventRecord[]
  ): Promise<void> {
    const oldStats = this.computePlayerStatsForMatch(oldMatch, oldEvents);
    const newStats = this.computePlayerStatsForMatch(newMatch, newEvents);

    const statsDeltaMap = new Map<string, Record<string, number>>();
    const getDelta = (playerId: string) => {
      let delta = statsDeltaMap.get(playerId);
      if (!delta) {
        delta = { games: 0, wins: 0, loses: 0, draws: 0, goals: 0, goalsConceded: 0 };
        statsDeltaMap.set(playerId, delta);
      }
      return delta;
    };

    // Add new stats
    for (const [playerId, playerStats] of newStats.entries()) {
      const delta = getDelta(playerId);
      for (const statCategory of Object.keys(playerStats)) {
        delta[statCategory] += playerStats[statCategory];
      }
    }

    // Subtract old stats
    for (const [playerId, playerStats] of oldStats.entries()) {
      const delta = getDelta(playerId);
      for (const statCategory of Object.keys(playerStats)) {
        delta[statCategory] -= playerStats[statCategory];
      }
    }

    // Cleanup zeros so we don't send useless updates to DB
    for (const [playerId, delta] of statsDeltaMap.entries()) {
      let hasChange = false;
      for (const statCategory of Object.keys(delta)) {
        if (delta[statCategory] === 0) {
          delete delta[statCategory];
        } else {
          hasChange = true;
        }
      }
      if (!hasChange) {
        statsDeltaMap.delete(playerId);
      }
    }
    // 3. Prepare Batch Data
    const matchPatch: Partial<MatchRecord> = {
      status: newMatch.status,
      winner: newMatch.winner,
      loser: newMatch.loser,
      wonTeamScore: newMatch.wonTeamScore,
      loseTeamScore: newMatch.loseTeamScore,
      winnerPlayerIds: newMatch.winnerPlayerIds,
      loserPlayerIds: newMatch.loserPlayerIds,
      gameStatus: newMatch.gameStatus,
      endedAt: newMatch.endedAt || (newMatch.status === 'completed' ? new Date() : undefined)
    };

    const eventChanges = {
      add: newEvents
        .filter((newEvent) => !newEvent.id)
        .map((newEvent) => {
          const { id, ...rest } = newEvent;
          return rest as Omit<MatchEventRecord, 'id'>;
        }),
      update: newEvents
        .filter((newEvent) => newEvent.id && !oldEvents.find((oldEvent) => oldEvent.id === newEvent.id && JSON.stringify(oldEvent) === JSON.stringify(newEvent)))
        .map((newEvent) => ({
          id: newEvent.id!,
          patch: { ...newEvent }
        })),
      deleteIds: oldEvents.filter((oldEvent) => !newEvents.find((newEvent) => newEvent.id === oldEvent.id)).map((oldEvent) => oldEvent.id!)
    };

    const playerStatsChanges = Array.from(statsDeltaMap.entries()).map(([playerId, statsDelta]) => ({
      playerId,
      statsDelta
    }));

    // Extract DateKey from match record using standard formatter (handles zero-padding)
    const matchDate = oldMatch.createdAt?.seconds
      ? new Date(oldMatch.createdAt.seconds * 1000)
      : new Date();
    const dateKey = formatDateToString(matchDate);

    await this.matchEventsApiService.applyAtomicMatchSync(
      groupId,
      matchId,
      matchPatch,
      eventChanges,
      playerStatsChanges,
      dateKey
    );

    // 4. Update local signals for immediate UI feedback (no refresh needed)
    this.updateLocalPlayers(playerStatsChanges, dateKey);
  }

  private updateLocalPlayers(
    playerStatsChanges: { playerId: string; statsDelta: Record<string, number> }[],
    dateKey: string
  ): void {
    const currentTeams = this.playersService.getTeams();
    playerStatsChanges.forEach(({ playerId, statsDelta }) => {
      let foundPlayer: Player | null = null;
      for (const teamKey of Object.keys(currentTeams)) {
        const player = currentTeams[teamKey].players.find((pl: Player) => pl.id === playerId);
        if (player) {
          foundPlayer = player;
          break;
        }
      }

      if (foundPlayer) {
        const updatedPlayer = JSON.parse(JSON.stringify(foundPlayer)) as Player;
        if (!updatedPlayer.statistics) updatedPlayer.statistics = {};
        if (!updatedPlayer.statistics[dateKey]) {
          updatedPlayer.statistics[dateKey] = { games: 0, wins: 0, loses: 0, draws: 0, goals: 0, goalsConceded: 0 };
        }

        const dayStats = updatedPlayer.statistics[dateKey] as any;
        Object.entries(statsDelta).forEach(([statCategory, categoryDelta]) => {
          dayStats[statCategory] = (dayStats[statCategory] || 0) + categoryDelta;
        });

        this.playersService.updatePlayerSignal(updatedPlayer);
      }
    });
  }
}
