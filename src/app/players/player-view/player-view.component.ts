import {Component, computed, input} from '@angular/core';
import {compareDates, currentDate} from '../../utils/date-utils';
import {Player, Statistics} from '../models/player.model';

enum PlayerFormStatus {
  UP='up',
  DOWN='down',
  NATURAL='natural',
}
@Component({
  selector: 'app-player-view',
  imports: [],
  templateUrl: './player-view.component.html',
  standalone: true,
  styleUrl: './player-view.component.scss'
})
export class PlayerViewComponent {

  showRating = input.required();
  player = input.required<Player>();
  showStatistics = input.required<boolean>();
  dateStatistics = input<string>();

  specificDateStats = computed(() => {
    const day = this.dateStatistics() || currentDate;
    return this.player().statistics?.[day];
  });

  playerView = computed(() => {
    const stats = this.specificDateStats();
    if(!stats || !this.showStatistics()) {
      return !this.showRating() ? this.player().name : this.player().name + ' - rating - ' + this.player().rating;
    }
    return !this.showRating() ?
      `${this.player().name} - goals: ${this.getDisplayValue(stats.goals)} - wins: ${this.getDisplayValue(stats.wins)} - loses: ${this.getDisplayValue(stats.loses)} - conceded: ${this.getDisplayValue(stats.goalsConceded)} -games: ${this.getDisplayValue(stats.games)}`
      : `${this.player().name} - rating ${this.player().rating} - goals: ${this.getDisplayValue(stats.goals)} - wins: ${this.getDisplayValue(stats.wins)} - loses: ${this.getDisplayValue(stats.loses)} -games: ${this.getDisplayValue(stats.games)}`
  })

  playerForm = computed(() => {
    const allStats = this.player().statistics;
    return this.calculatePlayerForm(Object.entries(allStats))
  })

  getDisplayValue(value: number) {
    if(value) {
      return  value;
    }
    return value === 0 ? '0' : '';
  }

  calculatePlayerForm(statsEntries: [string, Statistics][]): PlayerFormStatus {
    if (statsEntries.length === 0) return PlayerFormStatus.NATURAL;

    const sortedStats = this.sortStatisticsByDate(statsEntries);
    const lastGame = sortedStats[sortedStats.length - 1];
    const prevGame = sortedStats[sortedStats.length - 2];

    const lastScore = this.calculatePerformanceScore(lastGame);
    const prevScore = prevGame ? this.calculatePerformanceScore(prevGame) : 0;

    // Only one game OR previous score is zero
    if (!prevGame || prevScore === 0) {
      return lastGame.goals >= 2 ? PlayerFormStatus.UP : PlayerFormStatus.NATURAL;
    }

    const ratio = lastScore / prevScore;

    // Significant drop → DOWN
    if (ratio <= 0.8) return PlayerFormStatus.DOWN;

    if (ratio >= 1.15 || lastGame.goals >= 2) return PlayerFormStatus.UP;

    return PlayerFormStatus.NATURAL;
  }

  calculatePerformanceScore(stat: Statistics) {
    return stat.goals + stat.wins * 0.3;
  }

  sortStatisticsByDate(entries: [string, Statistics][]): Statistics[] {
    return (entries || [])
      .sort(([a], [b]) => compareDates(a, b))
      .map(([date, stat]) => stat);
  }

  get PlayerFormStatus() {
    return PlayerFormStatus;
  }
}
