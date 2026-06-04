import { inject, Injectable, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { MatchEventsApiService } from './match-events-api.service';
import { PlayersService } from '../../players/players.service';
import { AuditTrailService } from '../../audit-trail/services/audit-trail.service';
import { formatDateToString } from '../../utils/date-utils';
import { PopupsService } from 'ui';
import { elapsedMsToGameMinute } from '../utils/timer-display';
import { MatchEventRecord, MatchRecord } from '../models/match-event.model';
import { Player } from '../../players/models/player.model';
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

  getActorId(): string {
    const user = this.auth.currentUser;
    return user?.email ?? user?.uid ?? '';
  }

  readonly liveMatchId = signal<string | null>(null);

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

  async addMatchEvent(
    groupId: string,
    matchId: string,
    event: Omit<MatchEventRecord, 'id'>
  ): Promise<string> {
    return this.matchEventsApiService.addEvent(groupId, matchId, event);
  }

  async removeMatchEvent(
    groupId: string,
    matchId: string,
    eventSnapshot: { id: string; deletedAt?: unknown }
  ): Promise<void> {
    if (eventSnapshot.deletedAt) return;
    await this.matchEventsApiService.deleteEvent(groupId, matchId, eventSnapshot.id);
  }

  async abandonLiveMatchOnReset(): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const matchId = this.liveMatchId();
    // Clear immediately so a quick reset → start can create a new match without racing.
    this.liveMatchId.set(null);
    if (!selectedGroup?.id || !matchId) return;
    try {
      const eventsObs = this.matchEventsApiService.getEvents(selectedGroup.id, matchId);
      const events = await firstValueFrom(eventsObs);

      const goalEventIdsToDelete = events
        .filter(event => !event.deletedAt && event.type === 'player_goal' && event.id)
        .map(event => event.id!);
      await this.matchEventsApiService.deleteEvents(selectedGroup.id, matchId, goalEventIdsToDelete);

      await this.matchEventsApiService.updateMatch(selectedGroup.id, matchId, {
        status: 'abandoned',
        endedAt: new Date()
      });
    } catch (e) {
      console.error('Failed to rollback abandoned match events:', e);
    }
  }

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

  async reconcileMatch(
    groupId: string,
    matchId: string,
    oldMatch: MatchRecord,
    newMatch: MatchRecord,
    oldEvents: MatchEventRecord[],
    newEvents: MatchEventRecord[]
  ): Promise<void> {
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
      deleteIds: oldEvents
        .filter((oldEvent) => !newEvents.find((newEvent) => newEvent.id === oldEvent.id))
        .map((oldEvent) => oldEvent.id!)
    };

    await this.matchEventsApiService.applyAtomicMatchSync(
      groupId,
      matchId,
      matchPatch,
      eventChanges
    );
  }
}
