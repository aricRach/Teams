import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { PopupsService } from 'ui';
import { PlayersService } from '../../players/players.service';
import { AdminControlService } from '../../user/admin-control.service';
import { MatchEventsManagerService } from '../../match-event-manager/services/match-events-manager.service';
import { MatchEventsApiService } from '../../match-event-manager/services/match-events-api.service';
import { AllMatchDataService } from '../../match-event-manager/services/all-match-data.service';
import { NavigationService } from '../../shared/navigation/navigation.service';
import { GameService } from '../game.service';
import { Player } from '../../players/models/player.model';
import { MatchEventRecord } from '../../match-event-manager/models/match-event.model';
import { PanelScorer } from './league-game-panel.component';
import { computeStandings, StandingsRow } from '../league-standings/standings.util';

/** The whole board switches to four teams while a league session is on screen. */
const LEAGUE_TEAM_COUNT = 4;

export type { StandingsRow } from '../league-standings/standings.util';

export const LEAGUE_SLOTS = [1, 2] as const;

/**
 * League state is in-memory only. A live league match doc is still tagged with
 * `slot` / `sessionId` / `teamKeys` (used by the standings table), but there is
 * no refresh-restore: reloading the page mid-game abandons the on-screen state.
 */
@Injectable()
export class LeagueGameService implements OnDestroy {
  private playersService = inject(PlayersService);
  private adminControl = inject(AdminControlService);
  private matchEvents = inject(MatchEventsManagerService);
  private eventsApi = inject(MatchEventsApiService);
  private allMatchData = inject(AllMatchDataService);
  private navigationService = inject(NavigationService);
  private gameService = inject(GameService);
  private popups = inject(PopupsService);

  private readonly previousTeamCount = this.playersService.numberOfTeams();

  constructor() {
    this.playersService.setNumberOfTeams(LEAGUE_TEAM_COUNT);
  }

  ngOnDestroy(): void {
    this.playersService.setNumberOfTeams(this.previousTeamCount);
  }

  readonly slots = LEAGUE_SLOTS;
  readonly teamCount = LEAGUE_TEAM_COUNT;

  /** Manual board move-lock, toggled via the lock button. Live-match teams are locked separately via `lockedTeamKeys`. */
  readonly isMovePlayersLocked = signal(false);

  readonly lockIcon = computed(() =>
    this.isMovePlayersLocked() ? 'assets/icons/unlock.svg' : 'assets/icons/lock.svg'
  );

  toggleMovePlayersLock(): void {
    this.isMovePlayersLocked.set(!this.isMovePlayersLocked());
  }

  /** teamKey -> slot (1 | 2). Absent = on the bench. */
  readonly assignments = signal<Record<string, number>>({});
  readonly sessionId = signal<string | null>(null);
  readonly activeSlot = signal<number>(LEAGUE_SLOTS[0]);

  readonly anySlotLive = computed(() => this.matchEvents.liveSlots().length > 0);
  readonly canFinishSession = computed(() => !!this.sessionId() && !this.anySlotLive());

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

  readonly standings = computed<StandingsRow[]>(() => {
    const sid = this.sessionId();
    if (!sid) return [];
    const matches = this.allMatchData.matchesWithEvents()
      .map(x => x.match)
      .filter(m => m.mode === 'league' && m.sessionId === sid && m.status === 'completed');
    return computeStandings(matches);
  });

  // --- Board view: everything the template used to pull from other services ---

  /** Live view of the board's teams, the stats overlay and the ratings toggle. */
  readonly teams = computed(() => this.playersService.getTeams());
  readonly playerStatsMap = this.gameService.computedStats;
  readonly showRating = computed(() => this.adminControl.getAdminControl().showRating);
  readonly teamAliases = computed(() => this.playersService.teamAliases());
  readonly isAdmin = computed(() => this.playersService.isAdmin());

  private readonly groupId = computed(() => this.playersService.selectedGroup()?.id ?? null);

  /** One live-events resource per slot, keyed by slot index in LEAGUE_SLOTS. */
  private readonly slotEvents = LEAGUE_SLOTS.map((slot) =>
    rxResource({
      params: () => ({ groupId: this.groupId(), matchId: this.matchEvents.liveMatchIdFor(slot) }),
      stream: ({ params }) =>
        params.groupId && params.matchId
          ? this.eventsApi.getAllEvents(params.groupId, params.matchId)
          : of([] as MatchEventRecord[])
    })
  );

  private eventsForSlot(slot: number): MatchEventRecord[] {
    const idx = this.slots.indexOf(slot as (typeof LEAGUE_SLOTS)[number]);
    return idx === -1 ? [] : (this.slotEvents[idx].value() ?? []);
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

  async startGame(slot: number): Promise<boolean> {
    if (!this.slotReady(slot) || this.slotLive(slot)) return false;

    const otherSlot = this.slots.find(s => s !== slot);
    if (otherSlot && this.slotTeams(otherSlot).length && this.sharedPlayerId(slot, otherSlot)) {
      this.popups.addErrorPopOut('The two games share a player - move them to one team first.');
      return false;
    }

    if (!this.playersService.selectedGroup()?.id) return false;

    if (!this.sessionId()) {
      this.sessionId.set(this.newSessionId());
    }

    let matchId: string | null = null;
    try {
      matchId = await this.matchEvents.onTimerStartedForMatch({
        slot,
        mode: 'league',
        sessionId: this.sessionId() ?? undefined,
        teamKeys: this.slotTeams(slot)
      });
    } catch (e) {
      console.error('Failed to start league match:', e);
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

  /** Close the current session locally so the next Start opens a fresh one. */
  finishSession(): void {
    this.sessionId.set(null);
    this.assignments.set({});
    this.activeSlot.set(this.slots[0]);
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

  private newSessionId(): string {
    const c: any = globalThis.crypto;
    if (c?.randomUUID) return c.randomUUID();
    return `ls-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
