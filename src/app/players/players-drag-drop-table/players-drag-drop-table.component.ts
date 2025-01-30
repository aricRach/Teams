import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges
} from '@angular/core';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {LongPressDirective} from '../../directives/long-press.directive';
import {GoalModalEvent, Player} from '../../app.component';
import {formatDateToString} from '../../utils/date-utils';
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
    this.setGoalModalData().player.statistics[this.currentDate]?.goals || 0)
  isSetGoalModalVisible = signal(false);

  modalPosition = { x: 0, y: 0 };

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
      console.log(event.previousContainer);

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

  setGoals(addGoal: boolean) {
    const teamName = this.setGoalModalData().team;
    // @ts-ignore
    const team = { ...this.playersService.teams()[teamName] }; // Clone the team
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData().player.name);

    if (playerIndex >= 0) {
      const players = [...team.players];
      const player = { ...players[playerIndex] };
      const stats = { ...player.statistics };
      const dateStats = { ...stats[this.currentDate] };

      if (addGoal) {
        dateStats.goals++;
      } else if (dateStats.goals > 0) {
        dateStats.goals--;
      }

      stats[this.currentDate] = dateStats;
      player.statistics = stats;
      players[playerIndex] = player;
      team.players = players;
      // this.setGoalModalData.update(data => data.player.statistics[this.currentDate].goals = dateStats.goals);
      this.playersService.teams.set({ ...this.playersService.teams(), [teamName]: team });
      this.getGoalModalDataByPlayer.set(dateStats.goals);
    }
  }

  get currentDate() {
    return formatDateToString(new Date())
  }

}
