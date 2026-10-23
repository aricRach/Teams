import {Component, input} from '@angular/core';
import {GameBoardSkeletonComponent} from '../../skeletons/game-board-skeleton/game-board-skeleton.component';
import {smoothLoading} from '../../../utils/smooth-loading.util';

@Component({
  selector: 'app-game-layout',
  imports: [GameBoardSkeletonComponent],
  templateUrl: './game-layout.component.html',
  styleUrl: './game-layout.component.scss',
})
export class GameLayoutComponent {
  readonly loading = input(false);
  readonly teamCount = input(2);

  protected readonly showSkeleton = smoothLoading(this.loading);
}
