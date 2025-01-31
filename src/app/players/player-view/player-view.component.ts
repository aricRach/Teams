import {Component, computed, input} from '@angular/core';
import {Player} from '../../app.component';
import {currentDate} from '../../utils/date-utils';

@Component({
  selector: 'app-player-view',
  imports: [],
  templateUrl: './player-view.component.html',
  standalone: true,
  styleUrl: './player-view.component.scss'
})
export class PlayerViewComponent {

  isAdminMode = input.required();
  player = input.required<Player>();
  showStatistics = input.required<boolean>();


  playerView = computed(() => {
    const stats = this.player().statistics[currentDate] ? this.player().statistics[currentDate] : null;
    if(!stats || !this.showStatistics()) {
      return !this.isAdminMode() ? this.player().name : this.player().name + ' - rating - ' + this.player().rating;
    }
    return !this.isAdminMode() ?
      `${this.player().name} - goals: ${stats.goals} - wins: ${stats.wins} - loses: ${stats.loses} -games: ${stats.games}`
      : `${this.player().name} - rating ${this.player().rating} - goals: ${stats.goals} - wins: ${stats.wins} - loses: ${stats.loses} -games: ${stats.games}`
  })

}
