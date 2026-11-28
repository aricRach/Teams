import {Component, computed, HostListener, inject, input, linkedSignal, output, signal,} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {form, FormField, maxLength} from '@angular/forms/signals';
import {DoubleClickDirective} from '../../directives/double-click.directive';
import {GoalModalEvent, Player, Statistics, TeamsOptions} from '../models/player.model';
import {currentDate} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {PlayersDragDropTableService} from './players-drag-drop-table.service';
import {TeamScoreBarsComponent} from '../../shared/team-score-bars/team-score-bars.component';
import {TeamLabelPipe} from '../../pipes/team-label.pipe';
import {TEAM_ALIAS_MAX_LENGTH, teamColorStyle} from '../../utils/team-label.util';
import {TeamColorPickerComponent} from '../../shared/team-color-picker/team-color-picker.component';
import {averageRating, totalRating} from '../../utils/team-rating.util';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, FormField, DoubleClickDirective, PlayerViewComponent, TeamScoreBarsComponent, TeamLabelPipe, TeamColorPickerComponent],
  standalone: true,
  providers: [PlayersDragDropTableService],
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  playersDragDropTableService = inject(PlayersDragDropTableService);
  isLocked = input.required();
  dateStatistics = input<string>();
  clonedTeams = input<any>();
  enableShowRatings = input(false);
  aliases = input<Record<string, string>>({});
  renameTeam = output<{teamKey: string, alias: string}>();
  colors = input<Record<string, string>>({});
  changeTeamColor = output<{teamKey: string, color: string}>();
  numberOfTeams = input<number>(Infinity);
  playerStatsMap = input<Map<string, Map<string, Statistics>>>(new Map());
  currentMatchId = input<string | null>(null);
  showStatisticsInput = input(false);
  showStatistics = linkedSignal(() => this.showStatisticsInput())

  availableSlots = input<readonly number[]>([]);
  teamSlots = input<Record<string, number>>({});
  teamSlotChange = output<Record<string, number>>();
  matchIdByTeam = input<Record<string, string | null>>({});
  lockedTeamKeys = input<string[]>([]);

  private liveMatchKey = computed(() =>
    Object.values(this.matchIdByTeam()).filter(Boolean).sort().join(',')
  );

  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent);

  renamingTeamKey = signal<string | null>(null);
  teamAliasModel = signal({ alias: '' });
  teamAliasForm = form(this.teamAliasModel, (fields) => {
    maxLength(fields.alias, TEAM_ALIAS_MAX_LENGTH);
  });

  liveSessionGoals = linkedSignal<Map<string, number>>(() => {
    this.currentMatchId();
    this.liveMatchKey();
    return new Map();
  });

  getGoalModalDataByPlayer = linkedSignal(() => {
    const playerId = this.setGoalModalData().player?.id ?? '';
    return (this.playerStatsMap().get(playerId)?.get(currentDate)?.goals || 0)
         + (this.liveSessionGoals().get(playerId) || 0);
  });
  isGoalIncreased = computed(() => {
    return this.getGoalModalDataByPlayer() >= this.originalGoals() + 1
  })
  originalGoals = linkedSignal(() => {
    const playerId = this.setGoalModalData().player?.id ?? '';
    return (this.playerStatsMap().get(playerId)?.get(currentDate)?.goals || 0)
         + (this.liveSessionGoals().get(playerId) || 0);
  });
  isSetGoalModalVisible = signal(false);

  modalPosition = signal({ x: 0, y: 0 });

  totalRatings = linkedSignal(() => this.setTotalRatingToAllTeams());

  recordGoalEvent = output<{player: Player, teamKey: string}>();
  recordOwnGoalEvent = output<{player: Player, teamKey: string}>();
  removePlayer = output<{team: string, index: number}>();

  ownGoalArmed = signal(false);

  readonly teamKeys = computed(() =>
    Object.keys(this.clonedTeams() ?? {}).filter(key => key !== 'allPlayers').slice(0, this.numberOfTeams()) as TeamsOptions[]
  );

  readonly unlockedTeamKeys = computed(() =>
    this.teamKeys().filter(key => !this.isTeamLocked(key))
  );

  readonly benchKey = 'allPlayers';
  readonly guestsListId = 'guests';

  readonly dropListRefs = computed(() => [...this.unlockedTeamKeys(), this.benchKey, this.guestsListId]);

  readonly teamColorStyles = computed<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, teamColorStyle(this.colors()[key])]))
  );

  readonly teamAverages = computed<Record<string, number>>(() =>
    Object.fromEntries(this.teamKeys().map(key => [key, averageRating(this.clonedTeams()?.[key]?.players ?? [])]))
  );


  dropPlayer = output();

  slotTeamCount(slot: number, exceptTeamKey?: string): number {
    return Object.entries(this.teamSlots())
      .filter(([key, value]) => value === slot && key !== exceptTeamKey)
      .length;
  }

  isSlotButtonDisabled(teamKey: string, slot: number): boolean {
    if (this.isTeamInLiveGame(teamKey)) return true;
    if (this.teamSlots()[teamKey] === slot) return false;
    const isEmpty = !this.clonedTeams()?.[teamKey]?.players?.length;
    return isEmpty || this.slotTeamCount(slot, teamKey) >= 2;
  }

  setTeamSlot(teamKey: string, slot: number | null) {
    if (this.isTeamInLiveGame(teamKey)) return;
    const current = { ...this.teamSlots() };
    if (slot === null || current[teamKey] === slot) {
      delete current[teamKey];
    } else {
      if (this.slotTeamCount(slot, teamKey) >= 2) return;
      current[teamKey] = slot;
    }
    this.teamSlotChange.emit(current);
  }

  // Picking teams for a game depends only on the team not being in a running game,
  // not on the drag-and-drop lock.
  isTeamInLiveGame(teamKey: string): boolean {
    return this.lockedTeamKeys().includes(teamKey);
  }

  isTeamLocked(teamKey: string): boolean {
    return !!this.isLocked() || this.lockedTeamKeys().includes(teamKey);
  }

  isGoalTaggingEnabled(teamKey: string): boolean {
    return !!this.matchIdByTeam()[teamKey];
  }

  private setTotalRatingToAllTeams() {
    const teams = this.clonedTeams();
    return Object.entries(teams).filter((team) => {
      return team[0] !== 'allPlayers'
    })
      .reduce((acc, [teamName, teamData]) => {
        // @ts-ignore
        acc[teamName] = totalRating(teamData.players);
        return acc;
      }, {} as any) as any
  }

  closeSetGoalModal() {
    this.isSetGoalModalVisible.set(false);
    this.ownGoalArmed.set(false);
  }

  /** Each list's data is its team key; the Guests list is part of the bench (`allPlayers`). */
  drop(event: CdkDragDrop<any>) {
    const teams = this.clonedTeams();
    const fromKey: string = event.previousContainer.data;
    const toKey: string = event.container.data;
    if (fromKey === toKey) {
      // The bench sections show filtered lists, so their order can't be changed by dragging.
      if (toKey === this.benchKey) return;
      moveItemInArray(teams[toKey].players, event.previousIndex, event.currentIndex);
    } else {
      const player = event.item.data as Player;
      const fromPlayers: Player[] = teams[fromKey].players;
      const fromIndex = fromPlayers.findIndex(p => p.id === player.id);
      if (fromIndex === -1) return;
      fromPlayers.splice(fromIndex, 1);
      const toPlayers: Player[] = teams[toKey].players;
      toPlayers.splice(toKey === this.benchKey ? toPlayers.length : event.currentIndex, 0, player);
      player.team = toKey as TeamsOptions;
    }
    this.dropPlayer.emit(teams);
  }

  /**
   * The bench is shown as two sections: regulars and guests.
   * A method, not a computed: drops change the teams in place.
   */
  benchPlayers(guests: boolean): Player[] {
    const players: Player[] = this.clonedTeams()?.[this.benchKey]?.players ?? [];
    return players.filter(player => !!player.isGuest === guests);
  }

  removeFromList(team: string, index: number) {
    this.removePlayer.emit({team, index});
  }

  openSetGoalModal(event: { position: {pageX: number, pageY: number}}, data: {player: any; team: string}): void {
    const pageX = event.position.pageX;
    const pageY = event.position.pageY;

    this.modalPosition.set({ x: pageX, y: pageY });
    this.setGoalModalData.set({
      player: data.player,
      team: data.team
    });
    this.ownGoalArmed.set(false);
    this.isSetGoalModalVisible.set(true);
  }

  setGoalModalClicked(addGoal: boolean) {
    let goals = this.getGoalModalDataByPlayer();
    if (addGoal) {
      if (goals >= this.originalGoals() + 1) return;
      goals++;
    } else if (goals > 0) {
      goals--;
    }
    this.getGoalModalDataByPlayer.set(goals);
  }

  setGoals() {
    const { player, team: teamKey } = this.setGoalModalData();
    if (player) {
      this.recordGoalEvent.emit({player, teamKey});
      const updated = new Map(this.liveSessionGoals());
      updated.set(player.id, (updated.get(player.id) || 0) + 1);
      this.liveSessionGoals.set(updated);
    }
    this.closeSetGoalModal();
  }

  setOwnGoal() {
    const { player, team: teamKey } = this.setGoalModalData();
    // No liveSessionGoals bump - an own goal must not credit the conceding player.
    if (player) {
      this.recordOwnGoalEvent.emit({player, teamKey});
    }
    this.closeSetGoalModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isSetGoalModalVisible()) {
      const modal = document.querySelector('.set-goal-modal');
      if (modal && !modal.contains(event.target as Node)) {
        this.isSetGoalModalVisible.set(false);
      }
    }
  }

  getPlayerDateStats(playerId: string): Statistics | undefined {
    return this.playerStatsMap().get(playerId)?.get(this.dateStatistics() || currentDate);
  }

  getPlayerStats(playerId: string): Map<string, Statistics> {
    return this.playerStatsMap().get(playerId) ?? new Map();
  }

  toggleShowStatistics() {
    this.showStatistics.set(!this.showStatistics());
  }

  startTeamRename(teamKey: string) {
    this.teamAliasModel.set({ alias: this.aliases()[teamKey] ?? '' });
    this.renamingTeamKey.set(teamKey);
  }

  cancelTeamRename() {
    this.renamingTeamKey.set(null);
  }

  saveTeamRename(teamKey: string) {
    this.renameTeam.emit({ teamKey, alias: this.teamAliasModel().alias });
    this.renamingTeamKey.set(null);
  }

  takenColorsExcluding(teamKey: string): string[] {
    return Object.entries(this.colors())
      .filter(([key]) => key !== teamKey)
      .map(([, value]) => value);
  }
}
