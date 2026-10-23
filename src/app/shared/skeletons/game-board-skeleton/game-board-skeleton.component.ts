import {Component, computed, input} from '@angular/core';

@Component({
  selector: 'app-game-board-skeleton',
  templateUrl: './game-board-skeleton.component.html',
  styleUrl: './game-board-skeleton.component.scss',
  host: {'aria-busy': 'true', 'aria-label': 'Loading players'},
})
export class GameBoardSkeletonComponent {
  readonly teamCount = input(2);

  protected readonly teams = computed(() => Array.from({length: this.teamCount()}));
  protected readonly playerRows = [1, 2, 3, 4, 5];
}
