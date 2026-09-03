import { Component, inject, viewChild } from '@angular/core';
import { PlayersDragDropTableComponent } from '../../players/players-drag-drop-table/players-drag-drop-table.component';
import { StopwatchComponent } from '../../stopwatch/stopwatch.component';
import { Player } from '../../players/models/player.model';
import { SingleGameService } from './single-game.service';

@Component({
  selector: 'app-single-game',
  imports: [PlayersDragDropTableComponent, StopwatchComponent],
  templateUrl: './single-game.component.html',
  standalone: true,
  providers: [SingleGameService],
  styleUrl: './single-game.component.scss'
})
export class SingleGameComponent {
  single = inject(SingleGameService);

  private stopwatch = viewChild(StopwatchComponent);

  async endGameFromTimer(): Promise<void> {
    if (await this.single.endGame()) {
      this.stopwatch()?.reset();
    }
  }

  recordGoal(goal: { player: Player; teamKey: string }): void {
    const ms = this.stopwatch()?.getElapsedMs() ?? 0;
    this.single.recordGoal(goal, ms);
  }
}
