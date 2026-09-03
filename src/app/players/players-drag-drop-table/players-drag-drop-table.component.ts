import {Component, computed, HostListener, inject, input, linkedSignal, output, signal,} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {DoubleClickDirective} from '../../directives/double-click.directive';
import {GoalModalEvent, Player, Statistics, TeamsOptions} from '../models/player.model';
import {currentDate} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {ModalComponent} from '../../../modals/modal/modal.component';
import {PlayersDragDropTableService} from './players-drag-drop-table.service';
import {TeamScoreBarsComponent} from '../../shared/team-score-bars/team-score-bars.component';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, DoubleClickDirective, PlayerViewComponent, ModalComponent, TeamScoreBarsComponent],
  standalone: true,
  providers: [PlayersDragDropTableService],
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  playersDragDropTableService = inject(PlayersDragDropTableService);
  isLocked = input.required();
  dateStatistics = input<string>();
  editStatistics = input(false);
  clonedTeams = input<any>();
  enableShowRatings = input(false);
  enableMakeBalancedTeams = input(true);
  numberOfTeams = input<number>(Infinity);
  playerStatsMap = input<Map<string, Map<string, Statistics>>>(new Map());
  currentMatchId = input<string | null>(null);
  showStatisticsInput = input(false);
  showStatistics = linkedSignal(() => this.showStatisticsInput())

  // League mode: show a G1 / G2 / – slot selector per team instead of the single "playing" checkbox.
  leagueAssignMode = input(false);
  teamSlots = input<Record<string, number>>({});
  teamSlotChange = output<Record<string, number>>();
  // League mode: teamKey -> the live matchId of the game that team is playing (null when its game isn't live).
  matchIdByTeam = input<Record<string, string | null>>({});
  // Teams whose game has started - their drop list is frozen even though the rest of the board isn't.
  lockedTeamKeys = input<string[]>([]);

  private liveMatchKey = computed(() =>
    Object.values(this.matchIdByTeam()).filter(Boolean).sort().join(',')
  );

  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent);
  makeBalancedTeamsModalVisible = signal(false);

  // Resets to an empty map whenever the live match(es) change (new game starts or game ends)
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
  removePlayer = output<{team: string, index: number}>();

  readonly teamKeys = computed(() =>
    Object.keys(this.clonedTeams() ?? {}).filter(key => key !== 'allPlayers').slice(0, this.numberOfTeams()) as TeamsOptions[]
  );

  readonly dropListRefs = computed(() =>
    [...this.teamKeys(), 'allPlayers']
  );

  dropPlayer = output();
  updateTeamStatistics = output<{players: Player[], team: TeamsOptions, name: string, number: number}>();

  playingTeams = input<string[]>([]);
  playingTeamsChange = output<string[]>();

  togglePlayingTeam(teamKey: string) {
    const current = this.playingTeams();
    if (current.includes(teamKey)) {
      this.playingTeamsChange.emit(current.filter(t => t !== teamKey));
    } else {
      if (current.length < 2) {
        this.playingTeamsChange.emit([...current, teamKey]);
      }
    }
  }

  slotTeamCount(slot: number, exceptTeamKey?: string): number {
    return Object.entries(this.teamSlots())
      .filter(([key, value]) => value === slot && key !== exceptTeamKey)
      .length;
  }

  isSlotButtonDisabled(teamKey: string, slot: number): boolean {
    if (this.isTeamLocked(teamKey)) return true;
    return this.teamSlots()[teamKey] !== slot && this.slotTeamCount(slot, teamKey) >= 2;
  }

  setTeamSlot(teamKey: string, slot: number | null) {
    if (this.isTeamLocked(teamKey)) return;
    const current = { ...this.teamSlots() };
    if (slot === null || current[teamKey] === slot) {
      delete current[teamKey];
    } else {
      if (this.slotTeamCount(slot, teamKey) >= 2) return;
      current[teamKey] = slot;
    }
    this.teamSlotChange.emit(current);
  }

  isTeamLocked(teamKey: string): boolean {
    return !!this.isLocked() || this.lockedTeamKeys().includes(teamKey);
  }

  /** Whether double-clicking a player in this team should open the goal modal. */
  isGoalTaggingEnabled(teamKey: string): boolean {
    if (this.leagueAssignMode()) {
      return !!this.matchIdByTeam()[teamKey];
    }
    return !!this.isLocked() && this.playingTeams().includes(teamKey);
  }

  private setTotalRatingToAllTeams() {
    const teams = this.clonedTeams();
    return Object.entries(teams).filter((team) => {
      return team[0] !== 'allPlayers'
    })
      .reduce((acc, [teamName, teamData]) => {
        // @ts-ignore
        acc[teamName] = this.calculateRating(teamData.players);
        return acc;
      }, {} as any) as any
  }

  closeSetGoalModal() {
    this.isSetGoalModalVisible.set(false);
  }

  calculateRating(players: Player[]) {
    return players.reduce((sum, player) => sum + player.rating, 0);
  }

  drop(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      event.container.data.forEach((p: Player) => {
        // @ts-ignore
        p.team = event.container.id;
      })
    }
    this.dropPlayer.emit(this.clonedTeams());
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

  makeBalancedTeams() {
      const teams = this.clonedTeams();
      this.playersDragDropTableService.makeBalancedTeams(teams);
  }

    setBalancedTeamsModal(confirm : boolean) {
    if(confirm) {
      this.makeBalancedTeams();
    }
    this.makeBalancedTeamsModalVisible.set(false);
  }

  toggleShowStatistics() {
    this.showStatistics.set(!this.showStatistics());
  }
}
