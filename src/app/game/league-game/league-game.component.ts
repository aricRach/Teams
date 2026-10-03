import { Component, inject, viewChild } from '@angular/core';
import { LeagueGameService } from './league-game.service';
import { GameSlotsBoardComponent } from '../shared/game-slots-board.component';
import { LeagueStandingsComponent } from '../league-standings/league-standings.component';
import { Player } from '../../players/models/player.model';

@Component({
  selector: 'app-league-game',
  standalone: true,
  imports: [GameSlotsBoardComponent, LeagueStandingsComponent],
  providers: [LeagueGameService],
  templateUrl: './league-game.component.html',
  styleUrl: './league-game.component.scss'
})
export class LeagueGameComponent {
  league = inject(LeagueGameService);

  board = viewChild.required(GameSlotsBoardComponent);

  async onStart(slot: number): Promise<void> {
    const ok = await this.league.startGame(slot);
    if (!ok) this.board().stopwatchForSlot(slot)?.clear();
  }

  onReset(slot: number): void {
    void this.league.resetGame(slot);
  }

  async onEnd(slot: number): Promise<void> {
    await this.league.endGame(slot);
    this.board().stopwatchForSlot(slot)?.clear();
  }

  recordGoal(goal: { player: Player; teamKey: string }): void {
    const slot = this.league.assignments()[goal.teamKey];
    if (!slot) return;
    const ms = this.board().stopwatchForSlot(slot)?.getElapsedMs() ?? 0;
    this.league.recordGoal(goal, ms);
  }

  recordOwnGoal(goal: { player: Player; teamKey: string }): void {
    const slot = this.league.assignments()[goal.teamKey];
    if (!slot) return;
    const ms = this.board().stopwatchForSlot(slot)?.getElapsedMs() ?? 0;
    this.league.recordOwnGoal(goal, ms);
  }

  finishSession(): void {
    this.league.finishSession();
  }
}
