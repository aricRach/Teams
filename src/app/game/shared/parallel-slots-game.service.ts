import { computed, effect, inject, Injectable, ResourceRef, signal, untracked, WritableSignal } from '@angular/core';
import { toDisplayMinute } from '../../match-event-manager/utils/timer-display';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { PopupsService } from 'ui';
import { PlayersService } from '../../players/players.service';
import { AdminControlService } from '../../user/admin-control.service';
import { LiveMatch, MatchEventsManagerService, StartMatchOptions } from '../../match-event-manager/services/match-events-manager.service';
import { countTeamsToShow } from './utils/team-count-to-show.util';
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
  startedAtMs: number | null;
  score: Record<string, number>;
  scorers: PanelScorer[];
}

@Injectable()
export abstract class ParallelSlotsGameService {
  protected playersService = inject(PlayersService);
  protected adminControl = inject(AdminControlService);
  protected matchEvents = inject(MatchEventsManagerService);
  protected eventsApi = inject(MatchEventsApiService);
  protected allMatchData = inject(AllMatchDataService);
  protected navigationService = inject(NavigationService);
  protected gameService = inject(GameService);
  protected popups = inject(PopupsService);

  private readonly slotEventsBySlot: Map<number, ResourceRef<MatchEventRecord[] | undefined>>;

  readonly teamCount = this.gameService.teamCount;

  readonly matchCount: WritableSignal<1 | 2>;

  protected constructor(readonly slots: readonly number[], defaultMatchCount: 1 | 2 = 2) {
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
    // An effect because games can be resumed while this page is open, and `assignments` is user-edited state
    // that many methods write to, so it can't be a computed. untracked: it reads and writes assignments itself.
    effect(() => {
      const liveMatches = this.matchEvents.liveMatchesBySlot();
      untracked(() => this.showLiveMatches(liveMatches));
    });
    effect(() => {
      const teamCount = this.teamCount();
      untracked(() => this.adjustToTeamCount(teamCount));
    });
  }

  // Puts the teams of live games back in their game, e.g. after the games were resumed from a
  // refresh. For a game started on this page they're already there, so nothing changes.
  private showLiveMatches(liveMatches: Record<number, LiveMatch>): void {
    const liveSlots = this.slots.filter(slot => liveMatches[slot]);
    const missingTeams = liveSlots.some(slot =>
      liveMatches[slot].teamKeys.some(teamKey => this.assignments()[teamKey] !== slot));
    if (!missingTeams) return;

    const next = { ...this.assignments() };
    for (const slot of liveSlots) {
      for (const [teamKey, assignedSlot] of Object.entries(next)) {
        if (assignedSlot === slot) delete next[teamKey];
      }
      for (const teamKey of liveMatches[slot].teamKeys) next[teamKey] = slot;
    }
    this.assignments.set(next);
    if (liveSlots.some(slot => slot !== this.slots[0])) this.matchCount.set(2);

    const teamCountNeeded = countTeamsToShow(Object.keys(this.playersService.getTeams()), Object.keys(next));
    if (teamCountNeeded > this.teamCount()) this.playersService.setNumberOfTeams(teamCountNeeded);
  }

  // Hidden teams can't play, and two parallel matches need 4 teams, so fall back to one match.
  // A running match is never touched.
  private adjustToTeamCount(teamCount: number): void {
    this.unpickEmptyTeams();
    if (teamCount !== 4 && !this.anySlotLive()) {
      this.switchToSingleMatch();
    }
  }

  // Takes teams with no players out of their game. Hidden teams show up empty in `teams()`,
  // so this covers them too. Teams in a live game are always kept.
  private unpickEmptyTeams(): void {
    const teams = this.teams();
    const locked = this.lockedTeamKeys();
    const next: Record<string, number> = {};
    for (const [teamKey, slot] of Object.entries(this.assignments())) {
      if (locked.includes(teamKey) || teams[teamKey]?.players?.length > 0) next[teamKey] = slot;
    }
    this.assignments.set(next);
  }

  readonly isMovePlayersLocked = signal(true);

  readonly lockIcon = computed(() =>
    this.isMovePlayersLocked() ? 'assets/icons/unlock.svg' : 'assets/icons/lock.svg'
  );

  toggleMovePlayersLock(): void {
    this.isMovePlayersLocked.set(!this.isMovePlayersLocked());
  }

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

  readonly teams = computed(() =>
    collapseExtraTeams(this.playersService.getTeams(), this.teamCount())
  );
  readonly playerStatsMap = this.gameService.computedStats;
  readonly showRating = computed(() => this.adminControl.getAdminControl().showRating);
  readonly teamAliases = computed(() => this.playersService.teamAliases());
  readonly teamColors = computed(() => this.playersService.teamColors());

  protected readonly groupId = computed(() => this.playersService.selectedGroup()?.id ?? null);

  readonly slotViewModels = computed<SlotViewModel[]>(() =>
    this.slots.map(slot => ({
      slot,
      teamKeys: this.slotTeams(slot),
      ready: this.slotReady(slot),
      live: this.slotLive(slot),
      startedAtMs: this.matchEvents.liveMatchesBySlot()[slot]?.startedAtMs ?? null,
      score: this.score(slot),
      scorers: this.scorers(slot)
    }))
  );

  readonly activeSlots = computed<readonly number[]>(() =>
    this.matchCount() === 2 ? this.slots : [this.slots[0]]
  );

  readonly visibleSlotViewModels = computed(() =>
    this.slotViewModels().filter(vm => this.activeSlots().includes(vm.slot))
  );

  readonly canToggleMatchCount = computed(() => !this.anySlotLive() && this.teamCount() === 4);

  setMatchCount(count: 1 | 2): void {
    if (count === this.matchCount() || !this.canToggleMatchCount()) return;
    if (count === 1) {
      this.switchToSingleMatch();
    } else {
      this.matchCount.set(2);
    }
  }

  // Only the first game is shown in single mode, so free the teams picked for the other game.
  private switchToSingleMatch(): void {
    const next = { ...this.assignments() };
    for (const [teamKey, slot] of Object.entries(next)) {
      if (slot !== this.slots[0]) delete next[teamKey];
    }
    this.assignments.set(next);
    this.matchCount.set(1);
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
        minute: toDisplayMinute(e.minute),
        teamKey: e.teamKey,
        isOwnGoal: e.type === 'own_goal'
      }))
      .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  }

  updateTeams(teams: any): void {
    // Hidden teams are always empty here: lowering the count moves their players to the bench.
    this.playersService.setTeams(teams);
    // Not saved here: the teams are saved when a game starts (startGame) and ends (GameService.endGame).
    this.unpickEmptyTeams();
  }

  renameTeam(teamKey: string, alias: string): void {
    void this.playersService.setTeamAlias(teamKey, alias);
  }

  changeTeamColor(teamKey: string, color: string): void {
    void this.playersService.setTeamColor(teamKey, color);
  }

  recordGoal(goal: { player: Player; teamKey: string }, elapsedMs: number): void {
    const slot = this.assignments()[goal.teamKey];
    if (!slot) return;
    void this.matchEvents.recordPlayerGoalFromTimer(goal.player, goal.teamKey, elapsedMs, slot);
  }

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
    const teamKeys = this.slotTeams(slot);
    const teams = this.teams();
    return teamKeys.length === 2 && teamKeys.every(key => teams[key]?.players?.length > 0);
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

    // Save the lineups now, so a refresh during the game brings back the teams that are playing.
    void this.playersService.savePlayers.run(undefined, true);
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
