import { computed, inject, Injectable, signal } from '@angular/core';
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

/** Options passed when a match is started for a given slot. */
export interface StartMatchOptions {
  mode?: 'single' | 'league';
  sessionId?: string;
  slot?: number;
  teamKeys?: string[];
}

/** slot number a single match always lives on. */
export const SINGLE_SLOT = 1;

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

  /** slot -> live matchId. Empty when nothing is live. */
  private readonly liveMatches = signal<Record<number, string | null>>({});

  /** Whether the currently live game(s) are a single match or a league session. */
  readonly liveMode = signal<'single' | 'league' | null>(null);

  /** Back-compat: the single-mode live match id (slot 1). */
  readonly liveMatchId = computed(() => this.liveMatchIdFor(SINGLE_SLOT));

  readonly hasAnyLiveMatch = computed(() =>
    Object.values(this.liveMatches()).some(Boolean)
  );

  liveMatchIdFor(slot = SINGLE_SLOT): string | null {
    return this.liveMatches()[slot] ?? null;
  }

  /** All slots that currently have a live match, ascending. */
  liveSlots(): number[] {
    return Object.entries(this.liveMatches())
      .filter(([, id]) => !!id)
      .map(([slot]) => Number(slot))
      .sort((a, b) => a - b);
  }

  private setLiveMatch(slot: number, matchId: string | null): void {
    this.liveMatches.update(current => {
      const next = { ...current };
      if (matchId) {
        next[slot] = matchId;
      } else {
        delete next[slot];
      }
      return next;
    });
    if (!this.hasAnyLiveMatch()) {
      this.liveMode.set(null);
    }
  }

  async onTimerStartedForMatch(slotOrOptions: number | StartMatchOptions = SINGLE_SLOT): Promise<string | null> {
    const options: StartMatchOptions = typeof slotOrOptions === 'number'
      ? { slot: slotOrOptions }
      : slotOrOptions;
    const slot = options.slot ?? SINGLE_SLOT;
    const mode = options.mode ?? 'single';

    const selectedGroup = this.playersService.selectedGroup();
    if (!selectedGroup?.id || this.liveMatchIdFor(slot)) {
      return null;
    }

    try {
      // Keep single-mode match docs byte-identical to before; only tag league matches.
      const matchDoc: Omit<MatchRecord, 'id'> = {
        status: 'live',
        startedAt: new Date(),
        createdBy: this.getActorId(),
        teamAliasSnapshot: { ...this.playersService.teamAliases() }
      };
      if (mode === 'league') {
        matchDoc.mode = 'league';
        matchDoc.slot = slot;
        if (options.sessionId) matchDoc.sessionId = options.sessionId;
        if (options.teamKeys?.length) matchDoc.teamKeys = options.teamKeys;
      }

      const id = await this.matchEventsApiService.createMatch(selectedGroup.id, matchDoc);
      this.setLiveMatch(slot, id);
      this.liveMode.set(mode);
      return id;
    } catch (e) {
      console.error('Failed to create live match:', e);
      this.popupsService.addErrorPopOut('Failed to start live match data sync.');
      return null;
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

  async abandonLiveMatchOnReset(slot = SINGLE_SLOT): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const matchId = this.liveMatchIdFor(slot);
    // Clear immediately so a quick reset → start can create a new match without racing.
    this.setLiveMatch(slot, null);
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

  async recordPlayerGoalFromTimer(player: Player, teamKey: string, elapsedMs: number, slot = SINGLE_SLOT): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const matchId = this.liveMatchIdFor(slot);
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

  async endGameAndPersist(gameDetails: GameDetails, slot = SINGLE_SLOT): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    if (!selectedGroup?.id || !gameDetails.gameStatus) {
      return Promise.reject();
    }

    const createdBy = this.getActorId();
    if (!createdBy) {
      this.popupsService.addErrorPopOut('Sign in to save the match.');
      return Promise.reject();
    }

    const existingLiveId = this.liveMatchIdFor(slot);

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
      this.setLiveMatch(slot, null);
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
        createdBy,
        teamAliasSnapshot: { ...this.playersService.teamAliases() }
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
