import { computed, inject, Injectable, OnDestroy, ResourceRef, signal, WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { PopupsService } from 'ui';
import { PlayersService } from '../../players/players.service';
import { AdminControlService } from '../../user/admin-control.service';
import { MatchEventsManagerService, StartMatchOptions } from '../../match-event-manager/services/match-events-manager.service';
import { MatchEventsApiService } from '../../match-event-manager/services/match-events-api.service';
import { AllMatchDataService } from '../../match-event-manager/services/all-match-data.service';
import { NavigationService } from '../../shared/navigation/navigation.service';
import { GameService } from '../game.service';
import { Player } from '../../players/models/player.model';
import { MatchEventRecord } from '../../match-event-manager/models/match-event.model';
import { PanelScorer } from './game-slot-panel.component';
import { collapseExtraTeams } from '../../utils/collapse-extra-teams.util';

export interface SlotViewModel {
  slot: number;
  teamKeys: string[];
  ready: boolean;
  live: boolean;
  score: Record<string, number>;
  scorers: PanelScorer[];
}

/**
 * Shared orchestration for a game mode that runs its matches in parallel "slots"
 * on the same board (single mode: 2 independent matches; league mode: 2 matches
 * feeding one session's standings). Concrete subclasses fix `slots`/`teamCount`
 * via the constructor and may override `startMatchOptions` to tag match docs
 * differently (league adds `mode`/`sessionId`).
 */
@Injectable()
export abstract class ParallelSlotsGameService implements OnDestroy {
  protected playersService = inject(PlayersService);
  protected adminControl = inject(AdminControlService);
  protected matchEvents = inject(MatchEventsManagerService);
  protected eventsApi = inject(MatchEventsApiService);
  protected allMatchData = inject(AllMatchDataService);
  protected navigationService = inject(NavigationService);
  protected gameService = inject(GameService);
  protected popups = inject(PopupsService);

  private readonly previousTeamCount: number;
  /** One live-events resource per slot, built once `slots` is known. */
  private readonly slotEventsBySlot: Map<number, ResourceRef<MatchEventRecord[] | undefined>>;

  protected constructor(
    readonly slots: readonly number[],
    readonly teamCount: number,
  ) {
    this.previousTeamCount = this.playersService.numberOfTeams();
    this.playersService.setNumberOfTeams(this.teamCount);
    this.activeSlot.set(this.slots[0]);
    this.slotEventsBySlot = new Map(this.slots.map(slot => [
      slot,
      rxResource({
        params: () => ({ groupId: this.groupId(), matchId: this.matchEvents.liveMatchIdFor(slot) }),
        stream: ({ params }) =>
          params.groupId && params.matchId
            ? this.eventsApi.getAllEvents(params.groupId, params.matchId)
            : of([] as MatchEventRecord[])
      })
    ]));
  }

  ngOnDestroy(): void {
    this.playersService.setNumberOfTeams(this.previousTeamCount);
  }

  /** Manual board move-lock, toggled via the lock button. Live-match teams are locked separately via `lockedTeamKeys`. */
  readonly isMovePlayersLocked = signal(false);

  readonly lockIcon = computed(() =>
    this.isMovePlayersLocked() ? 'assets/icons/unlock.svg' : 'assets/icons/lock.svg'
  );

  toggleMovePlayersLock(): void {
    this.isMovePlayersLocked.set(!this.isMovePlayersLocked());
  }

  /** teamKey -> slot. Absent = on the bench. */
  readonly assignments = signal<Record<string, number>>({});
  readonly activeSlot: WritableSignal<number> = signal(0);

  readonly anySlotLive = computed(() => this.matchEvents.liveSlots().length > 0);

  readonly matchIdByTeam = computed<Record<string, string | null>>(() => {
    const out: Record<string, string | null> = {};
    for (const [teamKey, slot] of Object.entries(this.assignments())) {
      out[teamKey] = this.matchEvents.liveMatchIdFor(slot);
    }
    return out;
  });

  readonly lockedTeamKeys = computed<string[]>(() =>
    Object.entries(this.assignments())
      .filter(([, slot]) => !!this.matchEvents.liveMatchIdFor(slot))
      .map(([teamKey]) => teamKey)
  );

  /** Live view of the board's teams, the stats overlay and the ratings toggle. */
  readonly teams = computed(() =>
    collapseExtraTeams(this.playersService.getTeams(), this.teamCount)
  );
  readonly playerStatsMap = this.gameService.computedStats;
  readonly showRating = computed(() => this.adminControl.getAdminControl().showRating);
  readonly teamAliases = computed(() => this.playersService.teamAliases());
  readonly isAdmin = computed(() => this.playersService.isAdmin());

  protected readonly groupId = computed(() => this.playersService.selectedGroup()?.id ?? null);

  /** Per-slot view-model the shared board component renders - one entry per panel. */
  readonly slotViewModels = computed<SlotViewModel[]>(() =>
    this.slots.map(slot => ({
      slot,
      teamKeys: this.slotTeams(slot),
      ready: this.slotReady(slot),
      live: this.slotLive(slot),
      score: this.score(slot),
      scorers: this.scorers(slot)
    }))
  );

  private eventsForSlot(slot: number): MatchEventRecord[] {
    return this.slotEventsBySlot.get(slot)?.value() ?? [];
  }

  score(slot: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.eventsForSlot(slot)) {
      if (e.type === 'player_goal' && !e.deletedAt && e.teamKey) {
        out[e.teamKey] = (out[e.teamKey] ?? 0) + 1;
      }
    }
    return out;
  }

  scorers(slot: number): PanelScorer[] {
    return this.eventsForSlot(slot)
      .filter((e) => e.type === 'player_goal' && !e.deletedAt)
      .map((e) => ({ name: e.playerNameSnapshot ?? 'Goal', minute: e.minute, teamKey: e.teamKey }))
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  }

  updateTeams(teams: any): void {
    this.playersService.setTeams(teams);
  }

  renameTeam(teamKey: string, alias: string): void {
    void this.playersService.setTeamAlias(teamKey, alias);
  }

  recordGoal(goal: { player: Player; teamKey: string }, elapsedMs: number): void {
    const slot = this.assignments()[goal.teamKey];
    if (!slot) return;
    void this.matchEvents.recordPlayerGoalFromTimer(goal.player, goal.teamKey, elapsedMs, slot);
  }

  slotTeams(slot: number): string[] {
    return Object.entries(this.assignments())
      .filter(([, s]) => s === slot)
      .map(([teamKey]) => teamKey);
  }

  slotReady(slot: number): boolean {
    return this.slotTeams(slot).length === 2;
  }

  slotLive(slot: number): boolean {
    return !!this.matchEvents.liveMatchIdFor(slot);
  }

  setAssignments(next: Record<string, number>): void {
    this.assignments.set(next);
  }

  private sharedPlayerId(slotA: number, slotB: number): boolean {
    const teams = this.playersService.getTeams();
    const idsOf = (slot: number) => new Set(
      this.slotTeams(slot).flatMap(k => (teams[k]?.players ?? []).map((p: any) => p.id))
    );
    const a = idsOf(slotA);
    for (const id of idsOf(slotB)) {
      if (a.has(id)) return true;
    }
    return false;
  }

  /** Options passed to `MatchEventsManagerService.onTimerStartedForMatch` when slot `slot` starts. Override to tag the match doc (e.g. league adds `mode`/`sessionId`). */
  protected startMatchOptions(slot: number): StartMatchOptions {
    return { slot, teamKeys: this.slotTeams(slot) };
  }

  async startGame(slot: number): Promise<boolean> {
    // Resuming after a local Pause re-fires the same start event; the match is
    // already live server-side, so treat it as a successful resume, not a failed start.
    if (this.slotLive(slot)) return true;
    if (!this.slotReady(slot)) return false;

    const otherSlot = this.slots.find(s => s !== slot);
    if (otherSlot && this.slotTeams(otherSlot).length && this.sharedPlayerId(slot, otherSlot)) {
      this.popups.addErrorPopOut('The two games share a player - move them to one team first.');
      return false;
    }

    if (!this.playersService.selectedGroup()?.id) return false;

    let matchId: string | null = null;
    try {
      matchId = await this.matchEvents.onTimerStartedForMatch(this.startMatchOptions(slot));
    } catch (e) {
      console.error('Failed to start match:', e);
    }
    if (!matchId) {
      this.popups.addErrorPopOut('Could not start the game. Check your connection and try again.');
      return false;
    }

    this.navigationService.lockNavigation();
    this.activeSlot.set(slot);
    return true;
  }

  async endGame(slot: number): Promise<void> {
    const [team1, team2] = this.slotTeams(slot);
    if (!team1 || !team2) return;

    await this.gameService.endGame({ team1, team2 }, slot);
    this.freeSlot(slot);
    this.retargetActiveSlot(slot);
  }

  async resetGame(slot: number): Promise<void> {
    await this.matchEvents.abandonLiveMatchOnReset(slot);
    this.freeSlot(slot);
    if (!this.anySlotLive()) {
      this.navigationService.unlockNavigation();
    }
    this.retargetActiveSlot(slot);
  }

  private freeSlot(slot: number): void {
    const next = { ...this.assignments() };
    for (const teamKey of this.slotTeams(slot)) delete next[teamKey];
    this.assignments.set(next);
  }

  private retargetActiveSlot(endedSlot: number): void {
    if (this.activeSlot() !== endedSlot) return;
    const otherLive = this.matchEvents.liveSlots().find(s => s !== endedSlot);
    if (otherLive) this.activeSlot.set(otherLive);
  }
}
