import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {PlayersService} from '../players/players.service';
import {Player, TeamsOptions} from '../players/models/player.model';
import {MatchEventsManagerService} from '../match-event-manager/services/match-events-manager.service';
import {ComputedStatisticsService} from '../statistics/services/computed-statistics.service';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {TEAM_ALIAS_MAX_LENGTH, teamColorStyle, teamDisplayName} from '../utils/team-label.util';
import {collapseExtraTeams, restoreHiddenTeams} from '../utils/collapse-extra-teams.util';
import {computeBalanceMeter} from '../utils/balance-meter.util';
import {averageRating, totalRating} from '../utils/team-rating.util';
import {PlayersDragDropTableService} from '../players/players-drag-drop-table/players-drag-drop-table.service';
import {PopupsService} from 'ui';
import {createMutation} from '../shared/optimistic/run-optimistic';
import {TeamBuilderApiService} from './team-builder-api.service';
import {filterBenchByName} from './utils/bench-search.util';


@Injectable()
export class TeamBuilderService {
  private playersService = inject(PlayersService);
  /** The bench is stored as the `allPlayers` team. */
  readonly bench = this.playersService.allPlayersLabel;
  private matchEvents = inject(MatchEventsManagerService);
  private computedStatsService = inject(ComputedStatisticsService);
  private router = inject(Router);
  private teamBuilderApiService = inject(TeamBuilderApiService);
  private popupsService = inject(PopupsService);
  // Reuses the existing balance algorithm and attack/defense scores.
  private balanceService = inject(PlayersDragDropTableService);

  readonly isLoading = this.playersService.isLoadingPlayers;
  readonly isAdmin = this.playersService.isAdmin;
  readonly isGameRunning = computed(() => this.matchEvents.liveMode() !== null);
  // Teams can't change while a game runs: the game page holds which teams are playing.
  readonly canEdit = computed(() => this.isAdmin() && !this.isGameRunning());
  readonly showGameRunningHint = computed(() => this.isAdmin() && this.isGameRunning());
  readonly gameUrl = computed(() => this.playersService.groupUrl('game'));
  readonly gameLinkLabel = computed(() => this.isGameRunning() ? 'Back to game →' : 'Start game →');
  readonly gameLinkHint = computed(() => this.isGameRunning() ? 'A game is in progress.' : 'Teams ready?');

  readonly teamCountOptions = [2, 3, 4];
  readonly teamCount = this.playersService.numberOfTeams;

  readonly teams = computed(() => collapseExtraTeams(this.playersService.getTeams(), this.teamCount()));
  readonly playerStatsMap = computed(() => this.computedStatsService.statsMap());
  // Page-only toggle: doesn't change the admin "show rating" setting used elsewhere.
  readonly showRating = signal(false);
  readonly ratingsButtonLabel = computed(() => this.showRating() ? 'Hide ratings' : 'Show ratings');

  toggleRatings(): void {
    this.showRating.update(show => !show);
  }
  readonly teamAliases = this.playersService.teamAliases;
  readonly teamColors = this.playersService.teamColors;

  readonly hasUnsavedChanges = this.playersService.hasUnsavedTeams;
  readonly isSaving = computed(() => this.playersService.savePlayers.pending());
  // Only changes made on this page are tracked (game-page moves are saved when a game ends),
  // so the status talks about this page, not about everything being saved.
  private readonly savedOnThisPage = signal(false);
  readonly saveStatus = computed(() => {
    if (this.isSaving()) return 'Saving teams…';
    if (this.hasUnsavedChanges()) return 'Unsaved changes';
    return this.savedOnThisPage() ? 'Teams saved' : 'No changes yet';
  });

  // In-app navigation is covered by unsavedTeamsGuard; this covers refresh and closing the tab.
  private readonly warnBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!this.isAdmin() || !this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  };

  // A touch laptop or tablet can switch between mouse and touch.
  private readonly onPointerChange = (event: MediaQueryListEvent) => this.isTouch.set(event.matches);

  constructor() {
    this.playersService.startTrackingTeamChanges();
    window.addEventListener('beforeunload', this.warnBeforeUnload);
    this.coarsePointerQuery.addEventListener('change', this.onPointerChange);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeunload', this.warnBeforeUnload);
      this.coarsePointerQuery.removeEventListener('change', this.onPointerChange);
    });
  }

  setTeamCount(count: number): void {
    if (!this.canEdit()) return;
    this.playersService.setNumberOfTeams(count);
  }

  updateTeams(teams: any): void {
    // The board shows hidden teams' players on the bench, so put them back in their teams.
    this.playersService.setTeams(restoreHiddenTeams(teams, this.playersService.getTeams(), this.teamCount()));
  }

  // Board ------------------------------------------------------------------

  readonly teamKeys = computed(() =>
    Object.keys(this.teams() ?? {}).filter(key => key !== this.bench).slice(0, this.teamCount())
  );
  readonly teamNames = computed<Record<string, string>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, teamDisplayName(key, this.teamAliases()[key])]))
  );
  readonly teamColorStyles = computed<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, teamColorStyle(this.teamColors()[key])]))
  );
  readonly teamPlayers = computed<Record<string, Player[]>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, this.teams()[key]?.players ?? []]))
  );
  readonly teamTotals = computed<Record<string, number>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, totalRating(this.teamPlayers()[key])]))
  );
  readonly teamAverages = computed<Record<string, number>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, averageRating(this.teamPlayers()[key])]))
  );
  readonly teamScores = this.balanceService.teamScores;

  readonly balanceMeter = computed(() => computeBalanceMeter(this.teamKeys().map(key => ({
    count: this.teamPlayers()[key].length,
    totalRating: this.teamTotals()[key],
  }))));
  // Empty when the gap shouldn't show (ratings hidden, or teams of different sizes).
  readonly balanceGapText = computed(() =>
    this.showRating() && this.balanceMeter() && !this.balanceMeter()?.uneven ? `gap ${this.balanceMeter()?.gap}` : ''
  );

  // The bench is one stored team, shown as two sections: regulars and guests. The search filters both.
  readonly benchSearch = signal('');
  readonly guestsListId = 'guests';
  private readonly benchRegulars = computed<Player[]>(() =>
    (this.teams()?.[this.bench]?.players ?? []).filter((player: Player) => !player.isGuest));
  private readonly benchGuests = computed<Player[]>(() =>
    (this.teams()?.[this.bench]?.players ?? []).filter((player: Player) => player.isGuest));
  readonly benchCount = computed(() => this.benchRegulars().length);
  readonly benchPlayers = computed(() => filterBenchByName(this.benchRegulars(), this.benchSearch()));
  readonly showNoBenchMatch = computed(() => this.benchCount() > 0 && this.benchPlayers().length === 0);
  readonly guestCount = computed(() => this.benchGuests().length);
  readonly guestPlayers = computed(() => filterBenchByName(this.benchGuests(), this.benchSearch()));
  readonly showNoGuestMatch = computed(() => this.guestCount() > 0 && this.guestPlayers().length === 0);

  // Guests: brought in with Add guest.
  readonly isAddGuestOpen = signal(false);
  // Clear guests (after the day): every guest leaves the teams and the Guests list and becomes inactive.
  readonly isClearGuestsConfirmVisible = signal(false);
  private readonly activeGuests = computed(() =>
    this.playersService.flattenPlayers(true, true).filter(player => player.isGuest));
  readonly showClearGuests = computed(() => this.canEdit() && this.activeGuests().length > 0);
  readonly clearGuestsLabel = computed(() => `Clear guests (${this.activeGuests().length})`);
  readonly clearGuestsHeading = computed(() => {
    const count = this.activeGuests().length;
    return `Clear ${count} ${count === 1 ? 'guest' : 'guests'}?`;
  });

  readonly clearGuestsMutation = createMutation({
    run: (guests: Player[]) =>
      this.teamBuilderApiService.setPlayersActive(this.playersService.selectedGroup().id, guests, false),
    onSuccess: (_, guests) => this.playersService.showAsInactive(guests),
    onError: () => this.popupsService.addErrorPopOut('Could not clear the guests, so they are still here.'),
  });

  clearGuests(): void {
    this.isClearGuestsConfirmVisible.set(false);
    if (!this.canEdit()) return;
    void this.clearGuestsMutation.run(this.activeGuests());
  }

  /** Moves a player to a team or to the bench. */
  movePlayer(playerId: string, toKey: string): void {
    if (!this.canEdit()) return;
    const teams = structuredClone(this.teams());
    const fromKey = Object.keys(teams).find(key => teams[key].players.some((player: Player) => player.id === playerId));
    if (!fromKey || fromKey === toKey || !teams[toKey]) return;
    const player = teams[fromKey].players.find((p: Player) => p.id === playerId)!;
    teams[fromKey].players = teams[fromKey].players.filter((p: Player) => p.id !== playerId);
    teams[toKey].players.push({ ...player, team: toKey as TeamsOptions });
    this.updateTeams(teams);
  }

  // Drag with a mouse. Phones and tablets use the move menu only, so dragging never fights with scrolling.
  private readonly coarsePointerQuery = window.matchMedia('(pointer: coarse)');
  private readonly isTouch = signal(this.coarsePointerQuery.matches);
  readonly isDragDisabled = computed(() => !this.canEdit() || this.isTouch());
  readonly dropListIds = computed(() => [...this.teamKeys(), this.bench, this.guestsListId]);
  private lastDragEndedAt = 0;

  dropPlayer(event: CdkDragDrop<string>): void {
    this.movePlayer((event.item.data as Player).id, event.container.data);
  }

  dragEnded(): void {
    this.lastDragEndedAt = Date.now();
  }

  // Move menu: tap a player, pick where they go.
  readonly moveMenu = signal<{ player: Player; fromKey: string; top: number; left: number } | null>(null);
  readonly moveOptions = computed(() => {
    const menu = this.moveMenu();
    if (!menu) return [];
    const teamOptions = this.teamKeys()
      .filter(key => key !== menu.fromKey)
      .map(key => ({
        key,
        label: this.teamNames()[key],
        count: this.teamPlayers()[key].length,
        style: this.teamColorStyles()[key],
      }));
    // A guest goes back to the Guests section, a regular to the Bench.
    const benchOption = menu.player.isGuest
      ? { key: this.bench, label: 'Guests', count: this.guestCount(), style: {} }
      : { key: this.bench, label: 'Bench', count: this.benchCount(), style: {} };
    return menu.fromKey === this.bench ? teamOptions : [...teamOptions, benchOption];
  });
  readonly moveMenuTitle = computed(() => `Move ${this.moveMenu()?.player.name ?? ''} to`);

  openMoveMenu(player: Player, fromKey: string, event: MouseEvent): void {
    // A mouse drag ends with a click on the same player: don't open the menu for it.
    if (!this.canEdit() || Date.now() - this.lastDragEndedAt < 300) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    // From a team: the other teams + Bench. From the bench: every team. Either way, one row per team.
    const menuWidth = 220;
    const menuHeight = 52 + this.teamKeys().length * 44;
    const fitsBelow = rect.bottom + menuHeight + 8 <= window.innerHeight;
    this.moveMenu.set({
      player,
      fromKey,
      top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - menuHeight - 4),
      left: Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8),
    });
  }

  chooseMoveTarget(toKey: string): void {
    const menu = this.moveMenu();
    this.moveMenu.set(null);
    if (menu) this.movePlayer(menu.player.id, toKey);
  }

  closeMoveMenu(): void {
    this.moveMenu.set(null);
  }

  // Rename + color
  readonly renamingTeamKey = signal<string | null>(null);
  readonly renameDraft = signal('');
  readonly aliasMaxLength = TEAM_ALIAS_MAX_LENGTH;

  startRename(teamKey: string): void {
    this.renameDraft.set(this.teamAliases()[teamKey] ?? '');
    this.renamingTeamKey.set(teamKey);
  }

  cancelRename(): void {
    this.renamingTeamKey.set(null);
  }

  saveRename(teamKey: string): void {
    this.renamingTeamKey.set(null);
    void this.playersService.setTeamAlias(teamKey, this.renameDraft());
  }

  changeTeamColor(teamKey: string, color: string): void {
    void this.playersService.setTeamColor(teamKey, color);
  }

  takenColorsExcluding(teamKey: string): string[] {
    return Object.entries(this.teamColors()).filter(([key]) => key !== teamKey).map(([, value]) => value);
  }

  // Balance
  readonly isBalanceConfirmVisible = signal(false);

  balance(): void {
    this.isBalanceConfirmVisible.set(false);
    if (!this.canEdit()) return;
    const balanced = this.balanceService.makeBalancedTeams(structuredClone(this.teams()));
    if (balanced) this.updateTeams(balanced);
  }

  // Clear: every player goes to the bench. Like any other change, it's saved only with Save.
  readonly isClearConfirmVisible = signal(false);
  readonly hasPlayersInTeams = computed(() => this.teamKeys().some(key => this.teamPlayers()[key].length > 0));

  clearTeams(): void {
    this.isClearConfirmVisible.set(false);
    if (!this.canEdit()) return;
    const teams = structuredClone(this.teams());
    for (const key of this.teamKeys()) {
      teams[this.bench].players.push(...teams[key].players.map((player: Player) => ({ ...player, team: this.bench as TeamsOptions })));
      teams[key].players = [];
    }
    this.updateTeams(teams);
  }

  async save(): Promise<void> {
    this.saveShownTeams();
    const saved = await this.playersService.savePlayers.run();
    if (!saved) return;
    this.savedOnThisPage.set(true);
    // Saved teams are ready to play, so go straight to the game.
    this.router.navigateByUrl(this.gameUrl());
  }

  // Saves the teams as shown: players of teams hidden by a lower team count go to the bench.
  private saveShownTeams(): void {
    this.playersService.setTeams(this.teams());
  }
}
