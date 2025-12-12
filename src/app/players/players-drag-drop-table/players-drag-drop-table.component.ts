import {Component, computed, HostListener, inject, input, linkedSignal, output, signal,} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {DoubleClickDirective} from '../../directives/double-click.directive';
import {GoalModalEvent, Player, TeamsOptions} from '../models/player.model';
import {currentDate} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {PlayersService} from '../players.service';
import {AuditTrailService} from '../../audit-trail/services/audit-trail.service';
import {shuffleArray} from '../../utils/array-utils';
import {ModalComponent} from '../../../modals/modal/modal.component';
import {AdminControlService} from '../../user/admin-control.service';
import {balancedTeamsSmallSize, balanceTeams} from './balance-teams';
import {NotDividableError} from '../errors/not-dividable-error';
import {PopupsService} from 'ui';
import {SpinnerService} from '../../spinner.service';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, DoubleClickDirective, PlayerViewComponent, ModalComponent],
  standalone: true,
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  popupsService = inject(PopupsService);

  isLocked = input.required();
  dateStatistics = input<string>();
  editStatistics = input(false);
  clonedTeams = input<any>();
  enableShowRatings = input(false);
  enableMakeBalancedTeams = input(true);
  showStatisticsInput = input(false);
  balanceTeamsTries = 0;
  showStatistics = linkedSignal(() => this.showStatisticsInput())
  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);
  auditTrailService = inject(AuditTrailService);

  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent) ;
  makeBalancedTeamsModalVisible = signal(false);
  getGoalModalDataByPlayer = linkedSignal(() =>
    this.setGoalModalData().player.statistics[currentDate]?.goals || 0)
  isSetGoalModalVisible = signal(false);

  modalPosition = signal({ x: 0, y: 0 });

  totalRatings = linkedSignal(() => this.setTotalRatingToAllTeams());

  readonly teamKeys = computed(() =>
    Object.keys(this.clonedTeams() ?? {}).filter(key => key !== 'allPlayers').slice(0, this.playersService.numberOfTeams()) as TeamsOptions[]
  );

  readonly dropListRefs = computed(() =>
    [...this.teamKeys(), 'allPlayers']
  );

  dropPlayer = output();
  updateTeamStatistics = output<{players: Player[], team: TeamsOptions, name: string, number: number}>();

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
      goals++;
    } else if (goals > 0) {
      goals--;
    }
    this.getGoalModalDataByPlayer.set(goals);
  }

  setGoals() {
    const teamName = this.setGoalModalData().team;
    const goals = this.getGoalModalDataByPlayer();
    const team = this.playersService.getTeams()[teamName];
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData().player.name);

    if (playerIndex >= 0) {
      const player = team.players[playerIndex];
      const stats = { ...player.statistics };
      const dateStats = { ...stats[currentDate] }; // make sure even if its undefined it will be {}
      const prevGoals = dateStats.goals;
      dateStats.goals = goals;
      team.players[playerIndex].statistics[currentDate] = dateStats;
      this.playersService.updatePlayerStats(team.players[playerIndex]).then(() => {
        this.auditTrailService.addAuditTrail(`goals set for ${player.name} ${prevGoals || 0} -> ${goals}`)
      });
      this.closeSetGoalModal();
    }
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
      const numberOfTeams = this.playersService.numberOfTeams();
      const includeGuests = true;
      const teamEntries = Object.entries(teams).slice(1, numberOfTeams + 1);
      const players = this.playersService.flattenPlayers(true, includeGuests, Object.fromEntries(teamEntries));
      this.balanceTeamsTries++;
      if(this.balanceTeamsTries %2 !== 0 && numberOfTeams <= 3 && players.length <= 18) {
        try {
          const teamMap = balancedTeamsSmallSize(shuffleArray(players), teamEntries, numberOfTeams);
          this.playersService.setTeams({...teams, ...teamMap});
        } catch (e) {
          if(e instanceof NotDividableError) {
            this.popupsService.addErrorPopOut(e.message);
          }
        }
      } else {
        const teamMap = balanceTeams(shuffleArray(players), teamEntries, numberOfTeams);
        this.playersService.setTeams({...teams, ...teamMap});
      }
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
