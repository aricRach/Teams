import {Component, computed, input} from '@angular/core';
import {currentDate} from '../../utils/date-utils';
import {Player} from '../models/player.model';

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
      `${this.player().name} - goals: ${this.getDisplayValue(stats.goals)} - wins: ${this.getDisplayValue(stats.wins)} - loses: ${this.getDisplayValue(stats.loses)} - conceded: ${this.getDisplayValue(stats.goalsConceded)} -games: ${this.getDisplayValue(stats.games)}`
      : `${this.player().name} - rating ${this.player().rating} - goals: ${this.getDisplayValue(stats.goals)} - wins: ${this.getDisplayValue(stats.wins)} - loses: ${this.getDisplayValue(stats.loses)} -games: ${this.getDisplayValue(stats.games)}`
  })

  getDisplayValue(value: number) {
    if(value) {
      return  value;
    }
    return value === 0 ? '0' : '';
  }

}
