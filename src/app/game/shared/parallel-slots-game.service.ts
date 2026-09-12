import { computed, effect, inject, Injectable, OnDestroy, ResourceRef, Signal, signal, WritableSignal } from '@angular/core';
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
import { computeGoalTally, isScoringEvent } from '../../match-event-manager/utils/scoring.util';

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

  /** The number of teams chosen on the group-selection screen, snapshotted when
   *  this service is created - also restored to the board on destroy. */
  protected readonly selectedTeamCount: number;
  /** One live-events resource per slot, built once `slots` is known. */
  private readonly slotEventsBySlot: Map<number, ResourceRef<MatchEventRecord[] | undefined>>;

  /** How many teams the board shows. A signal (not a fixed value) so a mode can
   *  vary it at runtime. */
  abstract readonly teamCount: Signal<number>;

  /** How many of `slots` are selectable/shown right now - 1 (just the first
   *  slot, classic single-match UI) or 2 (both slots, G1/G2 selector). The
   *  slot(s) beyond that stay wired up underneath but hidden. */
  readonly matchCount: WritableSignal<1 | 2>;

  protected constructor(readonly slots: readonly number[], defaultMatchCount: 1 | 2 = 2) {
    this.selectedTeamCount = this.playersService.numberOfTeams();
    this.matchCount = signal(defaultMatchCount);
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
    // Deferred to an effect (not called eagerly here) because `teamCount` is
    // implemented by the subclass and may read the subclass's own signals,
    // which aren't initialized until after this base constructor returns.
    effect(() => {
      this.playersService.setNumberOfTeams(this.teamCount());
    });
  }

  ngOnDestroy(): void {
    this.playersService.setNumberOfTeams(this.selectedTeamCount);
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
    collapseExtraTeams(this.playersService.getTeams(), this.teamCount())
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

  /** Only these slots are selectable/rendered right now. */
  readonly activeSlots = computed<readonly number[]>(() =>
    this.matchCount() === 2 ? this.slots : [this.slots[0]]
  );

  /** `slotViewModels` filtered down to the currently active slot(s) - what the board actually renders. */
  readonly visibleSlotViewModels = computed(() =>
    this.slotViewModels().filter(vm => this.activeSlots().includes(vm.slot))
  );

  readonly canToggleMatchCount = computed(() => !this.anySlotLive() && this.teamCount() === 4);

  setMatchCount(count: 1 | 2): void {
    if (count === this.matchCount() || !this.canToggleMatchCount()) return;
    if (count === 1) {
      // Narrowing back to one slot - drop picks on the slot(s) being hidden so
      // they don't silently resurface (still assigned) if Multiple is picked again later.
      const next = { ...this.assignments() };
      for (const [teamKey, slot] of Object.entries(next)) {
        if (slot !== this.slots[0]) delete next[teamKey];
      }
      this.assignments.set(next);
    }
    this.matchCount.set(count);
  }

  private eventsForSlot(slot: number): MatchEventRecord[] {
    return this.slotEventsBySlot.get(slot)?.value() ?? [];
  }

  score(slot: number): Record<string, number> {
    return computeGoalTally(this.eventsForSlot(slot));
  }

  scorers(slot: number): PanelScorer[] {
    return this.eventsForSlot(slot)
      .filter((e) => isScoringEvent(e))
      .map((e) => ({
        name: e.playerNameSnapshot ?? 'Goal',
        minute: e.minute,
        teamKey: e.teamKey,
        isOwnGoal: e.type === 'own_goal'
      }))
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

  /** `concede.teamKey` is the conceding player's own team; the goal is credited to the other team in the slot. */
  recordOwnGoal(concede: { player: Player; teamKey: string }, elapsedMs: number): void {
    const slot = this.assignments()[concede.teamKey];
    if (!slot) return;
    const beneficiary = this.slotTeams(slot).find((k) => k !== concede.teamKey);
    if (!beneficiary) return;
    void this.matchEvents.recordOwnGoalFromTimer(concede.player, beneficiary, elapsedMs, slot);
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

    if (!this.slotLive(slot)) {
      this.freeSlot(slot);
      this.retargetActiveSlot(slot);
      return;
    }

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
