import { computed, inject, Injectable, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { MatchEventsApiService } from './match-events-api.service';
import { PlayersService } from '../../players/players.service';
import { AuditTrailService } from '../../audit-trail/services/audit-trail.service';
import { formatDateToString } from '../../utils/date-utils';
import { PopupsService } from 'ui';
import { elapsedMsToGameMinute } from '../utils/timer-display';
import { MatchEventRecord, MatchRecord } from '../models/match-event.model';
import { isScoringEvent } from '../utils/scoring.util';
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

export interface StartMatchOptions {
  mode?: 'single' | 'league';
  sessionId?: string;
  slot?: number;
  teamKeys?: string[];
}

export const SINGLE_SLOT = 1;

/** A match running on this device, with what the game page needs to show it again after a refresh. */
export interface LiveMatch {
  id: string;
  teamKeys: string[];
  startedAtMs: number;
  sessionId?: string;
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

  private readonly liveMatches = signal<Record<number, LiveMatch>>({});

  readonly liveMatchesBySlot = this.liveMatches.asReadonly();

  readonly liveMode = signal<'single' | 'league' | null>(null);

  readonly liveMatchId = computed(() => this.liveMatchIdFor(SINGLE_SLOT));

  readonly hasAnyLiveMatch = computed(() => Object.keys(this.liveMatches()).length > 0);

  // The live league games all belong to the same session.
  readonly liveSessionId = computed(() =>
    Object.values(this.liveMatches()).find(liveMatch => liveMatch.sessionId)?.sessionId ?? null
  );

  liveMatchIdFor(slot = SINGLE_SLOT): string | null {
    return this.liveMatches()[slot]?.id ?? null;
  }

  liveSlots(): number[] {
    return Object.keys(this.liveMatches())
      .map(Number)
      .sort((a, b) => a - b);
  }

  private setLiveMatch(slot: number, liveMatch: LiveMatch | null): void {
    this.liveMatches.update(current => {
      const next = { ...current };
      if (liveMatch) {
        next[slot] = liveMatch;
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
      const startedAt = new Date();
      const teamKeys = options.teamKeys ?? [];
      // mode, slot and teamKeys are saved for every match, so it can be resumed after a refresh.
      const matchDoc: Omit<MatchRecord, 'id'> = {
        status: 'live',
        startedAt,
        createdBy: this.getActorId(),
        teamAliasSnapshot: { ...this.playersService.teamAliases() },
        mode,
        slot,
        teamKeys
      };
      if (mode === 'league' && options.sessionId) matchDoc.sessionId = options.sessionId;

      const id = await this.matchEventsApiService.createMatch(selectedGroup.id, matchDoc);
      this.setLiveMatch(slot, { id, teamKeys, startedAtMs: startedAt.getTime(), sessionId: matchDoc.sessionId });
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

  /** Marks matches that are live in the DB (e.g. after a page refresh) as running on this device again. */
  resumeLiveMatches(matches: MatchRecord[]): void {
    for (const match of matches) {
      if (!match.id || !match.slot || !match.teamKeys) continue;
      this.setLiveMatch(match.slot, {
        id: match.id,
        teamKeys: match.teamKeys,
        startedAtMs: match.startedAt.toMillis(),
        sessionId: match.sessionId
      });
    }
    if (this.hasAnyLiveMatch()) {
      this.liveMode.set(matches[0].mode ?? 'single');
    }
  }

  async abandonLiveMatchOnReset(slot = SINGLE_SLOT): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const matchId = this.liveMatchIdFor(slot);
    // Clear immediately so a quick reset → start can create a new match without racing.
    this.setLiveMatch(slot, null);
    if (!selectedGroup?.id || !matchId) return;
    try {
      await this.abandonMatch(selectedGroup.id, matchId);
    } catch (e) {
      console.error('Failed to rollback abandoned match events:', e);
    }
  }

  /** Deletes the match's goals and marks it abandoned. */
  async abandonMatch(groupId: string, matchId: string): Promise<void> {
    const events = await firstValueFrom(this.matchEventsApiService.getEvents(groupId, matchId));
    const goalEventIdsToDelete = events
      .filter(event => isScoringEvent(event) && event.id)
      .map(event => event.id!);
    await this.matchEventsApiService.deleteEvents(groupId, matchId, goalEventIdsToDelete);
    await this.matchEventsApiService.updateMatch(groupId, matchId, {
      status: 'abandoned',
      endedAt: new Date()
    });
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

  async recordOwnGoalFromTimer(concedingPlayer: Player, beneficiaryTeamKey: string, elapsedMs: number, slot = SINGLE_SLOT): Promise<void> {
    const selectedGroup = this.playersService.selectedGroup();
    const matchId = this.liveMatchIdFor(slot);
    if (!selectedGroup?.id || !matchId) {
      this.popupsService.addErrorPopOut('Start the match timer first.');
      return;
    }

    if (!concedingPlayer?.id || !beneficiaryTeamKey) {
      this.popupsService.addErrorPopOut('Could not save own goal event.');
      return;
    }

    const createdBy = this.getActorId();
    const minute = elapsedMsToGameMinute(elapsedMs);

    try {
      await this.addMatchEvent(selectedGroup.id, matchId, {
        type: 'own_goal',
        source: 'manual',
        createdBy,
        playerId: concedingPlayer.id,
        playerNameSnapshot: concedingPlayer.name,
        teamKey: beneficiaryTeamKey,
        minute,
        payload: {
          timerMs: elapsedMs
        }
      });
    } catch (e) {
      console.error('Failed to save own goal event:', e);
      this.popupsService.addErrorPopOut('Could not save own goal event.');
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
    if (!existingLiveId) {
      console.warn(`endGameAndPersist called for slot ${slot} with no live match - ignoring.`);
      return;
    }

    const teams = this.playersService.getTeams();
    const winnerPlayerIds = (teams[gameDetails.winner]?.players || []).map((player: Player) => player.id);
    const loserPlayerIds = (teams[gameDetails.loser]?.players || []).map((player: Player) => player.id);

    const matchId = existingLiveId;
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
    // The match itself is saved as of here - clear the live flag so the slot is
    // free to start again even if the follow-up event/audit-trail writes below fail.
    this.setLiveMatch(slot, null);

    try {
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
    } catch (e) {
      console.error(`Failed to record team_result/audit trail for match ${matchId}:`, e);
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
    const fullPatch: Partial<MatchRecord> = {
      status: newMatch.status,
      winner: newMatch.winner,
      loser: newMatch.loser,
      wonTeamScore: newMatch.wonTeamScore,
      loseTeamScore: newMatch.loseTeamScore,
      winnerPlayerIds: newMatch.winnerPlayerIds,
      loserPlayerIds: newMatch.loserPlayerIds,
      gameStatus: newMatch.gameStatus,
      mode: newMatch.mode,
      endedAt: newMatch.endedAt || (newMatch.status === 'completed' ? new Date() : undefined),
      // A match whose status is changed here is no longer part of a voided day, so Restore day leaves it alone.
      ...(newMatch.status !== oldMatch.status ? { voidedBy: null } : {})
    };
    // Firestore rejects undefined values (e.g. no endedAt when a live match is voided), so leave those fields out.
    const matchPatch = Object.fromEntries(
      Object.entries(fullPatch).filter(([, value]) => value !== undefined)
    ) as Partial<MatchRecord>;

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
