import {Component, computed, HostListener, inject, input, linkedSignal, output, signal,} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {DoubleClickDirective} from '../../directives/double-click.directive';
import {GoalModalEvent, Player, TeamsOptions} from '../models/player.model';
import {currentDate} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {PlayersService} from '../players.service';
import {ModalComponent} from '../../../modals/modal/modal.component';
import {AdminControlService} from '../../user/admin-control.service';
import {PopupsService} from 'ui';
import {PlayersDragDropTableService} from './players-drag-drop-table.service';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, DoubleClickDirective, PlayerViewComponent, ModalComponent],
  standalone: true,
  providers: [PlayersDragDropTableService],
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  popupsService = inject(PopupsService);
  playersDragDropTableService = inject(PlayersDragDropTableService);
  isLocked = input.required();
  dateStatistics = input<string>();
  editStatistics = input(false);
  clonedTeams = input<any>();
  enableShowRatings = input(false);
  enableMakeBalancedTeams = input(true);
  showStatisticsInput = input(false);
  showStatistics = linkedSignal(() => this.showStatisticsInput())
  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);

  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent) ;
  makeBalancedTeamsModalVisible = signal(false);
  getGoalModalDataByPlayer = linkedSignal(() =>
    this.setGoalModalData().player?.statistics?.[currentDate]?.goals || 0)
  isGoalIncreased = computed(() => {
    return this.getGoalModalDataByPlayer() >= this.originalGoals() + 1
  })
  originalGoals = linkedSignal(() =>
    this.setGoalModalData().player?.statistics?.[currentDate]?.goals || 0)
  isSetGoalModalVisible = signal(false);

  modalPosition = signal({ x: 0, y: 0 });

  totalRatings = linkedSignal(() => this.setTotalRatingToAllTeams());

  recordGoalEvent = output<{player: Player, teamKey: string}>();

  readonly teamKeys = computed(() =>
    Object.keys(this.clonedTeams() ?? {}).filter(key => key !== 'allPlayers').slice(0, this.playersService.numberOfTeams()) as TeamsOptions[]
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
    const allTeams = this.playersService.getTeams();
    allTeams[team]?.players.splice(index, 1);
    this.playersService.setTeams(allTeams);
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
    const teamKey = this.setGoalModalData().team;
    const team = this.playersService.getTeams()[teamKey];
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData().player.name);
    if (playerIndex >= 0) {
        const player = team.players[playerIndex];
        this.recordGoalEvent.emit({player, teamKey})
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
