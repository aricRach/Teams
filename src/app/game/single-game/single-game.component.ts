import { Component, inject, viewChild } from '@angular/core';
import { SingleGameService } from './single-game.service';
import { GameSlotsBoardComponent } from '../shared/game-slots-board.component';
import { Player } from '../../players/models/player.model';

@Component({
  selector: 'app-single-game',
  standalone: true,
  imports: [GameSlotsBoardComponent],
  providers: [SingleGameService],
  templateUrl: './single-game.component.html',
  styleUrl: './single-game.component.scss'
})
export class SingleGameComponent {
  single = inject(SingleGameService);

  board = viewChild.required(GameSlotsBoardComponent);

  async onStart(slot: number): Promise<void> {
    const ok = await this.single.startGame(slot);
    if (!ok) this.board().stopwatchForSlot(slot)?.clear();
  }

  onReset(slot: number): void {
    void this.single.resetGame(slot);
  }

  async onEnd(slot: number): Promise<void> {
    await this.single.endGame(slot);
    this.board().stopwatchForSlot(slot)?.clear();
  }

  recordGoal(goal: { player: Player; teamKey: string }): void {
    const slot = this.single.assignments()[goal.teamKey];
    if (!slot) return;
    const ms = this.board().stopwatchForSlot(slot)?.getElapsedMs() ?? 0;
    this.single.recordGoal(goal, ms);
  }

  recordOwnGoal(goal: { player: Player; teamKey: string }): void {
    const slot = this.single.assignments()[goal.teamKey];
    if (!slot) return;
    const ms = this.board().stopwatchForSlot(slot)?.getElapsedMs() ?? 0;
    this.single.recordOwnGoal(goal, ms);
  }
}
