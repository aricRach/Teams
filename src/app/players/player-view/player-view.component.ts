import {Component, computed, inject, input, OnChanges, SimpleChanges} from '@angular/core';
import {Player} from '../../app.component';
import {formatDateToString} from '../../utils/date-utils';
import {PlayersService} from '../players.service';

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

  get currentDate() {
    return formatDateToString(new Date())
  }

  playerView = computed(() => {
    const stats = this.player().statistics[this.currentDate] ? this.player().statistics[this.currentDate] : null;
    if(!stats) {
      return !this.isAdminMode() ? this.player().name : this.player().name + ' - rating - ' + this.player().rating;
    }
    return !this.isAdminMode() ?
      `${this.player().name} - goals: ${stats.goals} - wins: ${stats.wins} - loses: ${stats.loses} -games: ${stats.games}`
      : `${this.player().name} - rating ${this.player().rating} - goals: ${stats.goals} - wins: ${stats.wins} - loses: ${stats.loses} -games: ${stats.games}`
  })

}
