import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {PopupsService} from 'ui';
import {PlayersService} from '../players/players.service';
import {Player, Statistics, TeamsOptions} from '../players/models/player.model';
import {MatchEventsManagerService} from '../match-event-manager/services/match-events-manager.service';
import {ComputedStatisticsService} from '../statistics/services/computed-statistics.service';
import {RevealApiService, RevealTeam, RevealSnapshot, PositionedPlayer, Position} from '../reveal/reveal-api.service';
import {computeTeamScores} from '../utils/team-scores.utils';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {formatTeamLabel, TEAM_ALIAS_MAX_LENGTH, teamColorStyle, teamDisplayName} from '../utils/team-label.util';
import {collapseExtraTeams, restoreHiddenTeams} from '../utils/collapse-extra-teams.util';
import {computeBalanceMeter} from '../utils/balance-meter.util';
import {averageRating, totalRating} from '../utils/team-rating.util';
import {createMutation} from '../shared/optimistic/run-optimistic';
import {PlayersDragDropTableService} from '../players/players-drag-drop-table/players-drag-drop-table.service';


@Injectable()
export class TeamBuilderService {
  private playersService = inject(PlayersService);
  /** The bench is stored as the `allPlayers` team. */
  readonly bench = this.playersService.allPlayersLabel;
  private matchEvents = inject(MatchEventsManagerService);
  private computedStatsService = inject(ComputedStatisticsService);
  private revealApi = inject(RevealApiService);
  private popupsService = inject(PopupsService);
  private router = inject(Router);
  // Reuses the existing balance algorithm and attack/defense scores.
  private balanceService = inject(PlayersDragDropTableService);

  readonly isLoading = this.playersService.isLoadingPlayers;
  readonly isAdmin = this.playersService.isAdmin;
  readonly isGameRunning = computed(() => this.matchEvents.liveMode() !== null);
  // Teams can't change while a game runs: the game page holds which teams are playing.
  readonly canEdit = computed(() => this.isAdmin() && !this.isGameRunning());
  readonly showGameRunningHint = computed(() => this.isAdmin() && this.isGameRunning());

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
  readonly isSaving = computed(() => this.playersService.savePlayers.pending() || this.reveal.pending());
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

  readonly benchSearch = signal('');
  readonly benchCount = computed(() => this.teams()?.[this.bench]?.players?.length ?? 0);
  readonly benchPlayers = computed<Player[]>(() => {
    const players: Player[] = this.teams()?.[this.bench]?.players ?? [];
    const query = this.benchSearch().trim().toLowerCase();
    return query ? players.filter(player => player.name.toLowerCase().includes(query)) : players;
  });
  readonly showNoBenchMatch = computed(() => this.benchCount() > 0 && this.benchPlayers().length === 0);

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
  readonly dropListIds = computed(() => [...this.teamKeys(), this.bench]);
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
    const benchOption = { key: this.bench, label: 'Bench', count: this.benchCount(), style: {} };
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
    if (saved) this.savedOnThisPage.set(true);
  }

  // Saves the teams as shown: players of teams hidden by a lower team count go to the bench.
  private saveShownTeams(): void {
    this.playersService.setTeams(this.teams());
  }

  readonly reveal = createMutation({
    run: async (groupId: string) => {
      this.saveShownTeams();
      // One after the other, so the reveal never shows teams that weren't saved.
      // A failed teams save already shows its own error.
      const teamsSaved = await this.playersService.savePlayers.run(undefined, true);
      if (!teamsSaved) return;
      await this.revealApi.saveSnapshot(groupId, this.buildSnapshot());

      // The copied link is a convenience: a denied clipboard permission must not block opening the reveal.
      const revealUrl = `${window.location.origin}/reveal?groupId=${groupId}`;
      await navigator.clipboard.writeText(revealUrl).then(
        () => this.popupsService.addSuccessPopOut('Link copied to clipboard!'),
        () => {},
      );
      this.router.navigate(['/reveal'], { queryParams: { groupId } });
    },
    onError: () => this.popupsService.addErrorPopOut("The teams were saved, but the reveal couldn't be created. Please try again."),
  });

  saveAndReveal(): void {
    const groupId = this.playersService.selectedGroup()?.id;
    // Not while a game runs: the teams that are playing can't change.
    if (!groupId || !this.canEdit()) return;
    void this.reveal.run(groupId);
  }

  private buildSnapshot(): RevealSnapshot {
    // Only the teams shown on the page: hidden teams' players are on the bench here.
    const rawTeams = this.teams();
    const statsMap = this.computedStatsService.statsMap();
    const scores   = computeTeamScores(rawTeams, statsMap);

    const aliases = this.playersService.teamAliases();
    const teams: RevealTeam[] = Object.entries(rawTeams)
      .filter(([key, team]: [string, any]) => key !== this.bench && team.players.length > 0)
      .map(([key, team]: [string, any]) => ({
        name:         formatTeamLabel(key, aliases[key]),
        rating:       Math.round(averageRating(team.players)),
        attackScore:  scores[key]?.attackScore  ?? 0,
        defenseScore: scores[key]?.defenseScore ?? 0,
        players:      this.assignPositions(team.players as Player[], statsMap),
      }));

    return { teams, savedAt: null };
  }

  private assignPositions(players: Player[], statsMap: Map<string, Map<string, Statistics>>): PositionedPlayer[] {
    const scored = players.map(p => {
      const dateMap = statsMap.get(p.id);
      let goals = 0, conceded = 0, games = 0;
      for (const s of (dateMap?.values() ?? [])) {
        goals    += s.goals         ?? 0;
        conceded += s.goalsConceded ?? 0;
        games    += s.games         ?? 0;
      }
      const atk = games > 0 ? goals    / games : 0;
      const def = games > 0 ? conceded / games : 0;
      return { name: p.name, score: atk - def };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.map((sp, i) => ({ name: sp.name, position: this.positionByIndex(i, scored.length) }));
  }

  private positionByIndex(index: number, total: number): Position {
    const third = total / 3;
    if (index < third)     return 'DEF';
    if (index < 2 * third) return 'MID';
    return 'FWD';
  }
}
