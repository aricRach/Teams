import {
  Component, computed, HostListener,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {DoubleClickDirective} from '../../directives/double-click.directive';
import {GoalModalEvent, Player} from '../models/player.model';
import {currentDate} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {PlayersService} from '../players.service';
import {AuditTrailService} from '../../audit-trail/services/audit-trail.service';
import {shuffleArray} from '../../utils/array-utils';
import {ModalComponent} from '../../../modals/modal/modal.component';
import {AdminControlService} from '../../user/admin-control.service';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, DoubleClickDirective, PlayerViewComponent, ModalComponent],
  standalone: true,
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  isGameOn = input.required();

  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);
  auditTrailService = inject(AuditTrailService);

  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent) ;
  makeBalancedTeamsModalVisible = signal(false);
  getGoalModalDataByPlayer = linkedSignal(() =>
    this.setGoalModalData().player.statistics[currentDate]?.goals || 0)
  isSetGoalModalVisible = signal(false);

  modalPosition = signal({ x: 0, y: 0 });

  showStatistics = signal(false);
  totalRatings = signal({
      teamA: this.calculateRating(this.playersService.teams().teamA.players),
      teamB: this.calculateRating(this.playersService.teams().teamB.players),
      teamC: this.calculateRating(this.playersService.teams().teamC.players),
  })

  isAdminMode = computed(() => this.adminControlService.adminControl().isAdminMode);
  toggleShowStatistics() {
    this.showStatistics.set(!this.showStatistics());
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
        this.totalRatings.set({
           teamA: this.calculateRating(this.playersService.teams().teamA.players),
           teamB: this.calculateRating(this.playersService.teams().teamB.players),
           teamC: this.calculateRating(this.playersService.teams().teamC.players),
        })
    }
  }

  removeFromList(team: string, index: number) {
    this.playersService.teams.update((teams: any) => {
      teams[team]?.players.splice(index, 1);
      return teams;
    })
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
    // @ts-ignore
    const team = { ...this.playersService.teams()[teamName] }; // Clone the team
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData().player.name);

    if (playerIndex >= 0) {
      const players = [...team.players];
      const player = { ...players[playerIndex] };
      const stats = { ...player.statistics };
      const dateStats = { ...stats[currentDate] };
      const prevGoals = dateStats.goals;
      dateStats.goals = goals;

      stats[currentDate] = dateStats;
      player.statistics = stats;
      players[playerIndex] = player;
      team.players = players;
      this.playersService.setTeams({ ...this.playersService.teams(), [teamName]: team });
      this.playersService.updatePlayer(player, true).then(() => {
        this.auditTrailService.addAuditTrail(`goals set for ${player.name} ${prevGoals || 0} -> ${dateStats.goals}`)
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
    const players = this.playersService.flattenPlayers({teamA: this.playersService.teams().teamA, teamB: this.playersService.teams().teamB, teamC: this.playersService.teams().teamC});
    const shuffledPlayers = shuffleArray(players);
    shuffledPlayers.sort((a, b) => b.rating - a.rating);

    const teamA: Player[] = [];
    const teamB: Player[] = [];
    const teamC: Player[] = [];
    let sumA = 0, sumB =0, sumC = 0;
    shuffledPlayers.forEach((player, index) => {
      if (index % 3 === 0) {
        teamA.push(player);
        sumA+=player.rating
      } else if (index % 3 === 1) {
        teamB.push(player);
        sumB+=player.rating
      } else {
        teamC.push(player);
        sumC+=player.rating

      }
    });
    this.playersService.teams.update(teams => {
      teams.teamA = {
        players: teamA,
        // totalRating: sumA
      }
      teams.teamB = {
        players: teamB,
        // totalRating: sumB
      }
        teams.teamC = {
          players: teamC,
          // totalRating: sumC
        }
      return teams;
    })
    return { teamA, teamB, teamC };
  }

  closeAuditTrailModal(confirm : boolean) {
    if(confirm) {
      this.makeBalancedTeams();
    }
    this.makeBalancedTeamsModalVisible.set(false);
  }
}
