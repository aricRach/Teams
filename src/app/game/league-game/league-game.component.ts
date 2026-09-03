import { Component, inject, viewChildren } from '@angular/core';
import { PlayersDragDropTableComponent } from '../../players/players-drag-drop-table/players-drag-drop-table.component';
import { LeagueGameService } from './league-game.service';
import { LeagueGamePanelComponent } from './league-game-panel.component';
import { LeagueStandingsComponent } from '../league-standings/league-standings.component';
import { Player } from '../../players/models/player.model';

@Component({
  selector: 'app-league-game',
  standalone: true,
  imports: [PlayersDragDropTableComponent, LeagueGamePanelComponent, LeagueStandingsComponent],
  providers: [LeagueGameService],
  templateUrl: './league-game.component.html',
  styleUrl: './league-game.component.scss'
})
export class LeagueGameComponent {
  league = inject(LeagueGameService);

  panels = viewChildren(LeagueGamePanelComponent);

  private panelForSlot(slot: number) {
    return this.panels().find(p => p.slot() === slot);
  }

  async onStart(slot: number): Promise<void> {
    const ok = await this.league.startGame(slot);
    if (!ok) this.panelForSlot(slot)?.stopwatch()?.clear();
  }

  onReset(slot: number): void {
    void this.league.resetGame(slot);
  }

  async onEnd(slot: number): Promise<void> {
    await this.league.endGame(slot);
    this.panelForSlot(slot)?.stopwatch()?.clear();
  }

  recordGoal(goal: { player: Player; teamKey: string }): void {
    const slot = this.league.assignments()[goal.teamKey];
    if (!slot) return;
    const ms = this.panelForSlot(slot)?.stopwatch()?.getElapsedMs() ?? 0;
    this.league.recordGoal(goal, ms);
  }

  finishSession(): void {
    this.league.finishSession();
  }
}
