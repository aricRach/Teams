import {
  Component,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {LongPressDirective} from '../../directives/long-press.directive';
import {GoalModalEvent, Player} from '../../app.component';
import {currentDate, formatDateToString} from '../../utils/date-utils';
import {PlayerViewComponent} from '../player-view/player-view.component';
import {PlayersService} from '../players.service';

@Component({
  selector: 'app-players-drag-drop-table',
  imports: [DragDropModule, CommonModule, LongPressDirective, PlayerViewComponent],
  standalone: true,
  templateUrl: './players-drag-drop-table.component.html',
  styleUrl: './players-drag-drop-table.component.scss'
})
export class PlayersDragDropTableComponent {

  isAdminMode = input.required();
  playersService = inject(PlayersService);

  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent) ;
  getGoalModalDataByPlayer = linkedSignal(() =>
    this.setGoalModalData().player.statistics[currentDate]?.goals || 0)
  isSetGoalModalVisible = signal(false);

  modalPosition = { x: 0, y: 0 };

  showStatistics = signal(false);

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
      // @ts-ignore
      this.playersService.teams.update((teams => {
        // @ts-ignore
        teams[event.previousContainer.id].totalRating = this.calculateRating(event.previousContainer.data)
        // @ts-ignore
        teams[event.container.id].totalRating = this.calculateRating(event.container.data)
        return teams
      }));
    }
  }

  removeFromList(team: string, index: number) {
    this.playersService.teams.update((teams: any) => {
      teams[team]?.players.splice(index, 1);
      return teams;
    })
  }

  openSetGoalModal(event: { mouseEvent: MouseEvent | TouchEvent; player: any; team: string }): void {
    const clientX = event.mouseEvent instanceof MouseEvent ? event.mouseEvent.clientX : (event.mouseEvent as TouchEvent).touches[0].clientX;
    const clientY = event.mouseEvent instanceof MouseEvent ? event.mouseEvent.clientY : (event.mouseEvent as TouchEvent).touches[0].clientY;

    this.modalPosition = { x: clientX, y: clientY };
    this.setGoalModalData.set({
      player: event.player,
      team: event.team
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

      dateStats.goals = goals;

      stats[currentDate] = dateStats;
      player.statistics = stats;
      players[playerIndex] = player;
      team.players = players;
      this.playersService.teams.set({ ...this.playersService.teams(), [teamName]: team });
      this.closeSetGoalModal();
    }
  }
}
