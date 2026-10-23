import { Component, input, output, viewChildren } from '@angular/core';
import { PlayersDragDropTableComponent } from '../../players/players-drag-drop-table/players-drag-drop-table.component';
import { GameSlotPanelComponent } from './game-slot-panel.component';
import { SlotViewModel } from './parallel-slots-game.service';
import { Player, Statistics } from '../../players/models/player.model';

@Component({
  selector: 'app-game-slots-board',
  standalone: true,
  imports: [GameSlotPanelComponent, PlayersDragDropTableComponent],
  templateUrl: './game-slots-board.component.html',
  styleUrl: './game-slots-board.component.scss'
})
export class GameSlotsBoardComponent {
  slotViewModels = input.required<SlotViewModel[]>();
  availableSlots = input<readonly number[]>([]);
  matchCount = input<1 | 2>(2);
  canToggleMatchCount = input(true);
  aliases = input<Record<string, string>>({});
  colors = input<Record<string, string>>({});
  teams = input<any>();
  teamCount = input<number>(Infinity);
  isMovePlayersLocked = input(false);
  assignments = input<Record<string, number>>({});
  matchIdByTeam = input<Record<string, string | null>>({});
  lockedTeamKeys = input<string[]>([]);
  showRating = input(false);
  isAdmin = input(false);
  playerStatsMap = input<Map<string, Map<string, Statistics>>>(new Map());

  matchCountChange = output<1 | 2>();
  start = output<number>();
  reset = output<number>();
  end = output<number>();
  recordGoal = output<{ player: Player; teamKey: string }>();
  recordOwnGoal = output<{ player: Player; teamKey: string }>();
  teamSlotChange = output<Record<string, number>>();
  dropPlayer = output<any>();
  renameTeam = output<{ teamKey: string; alias: string }>();
  changeTeamColor = output<{ teamKey: string; color: string }>();

  private readonly panels = viewChildren(GameSlotPanelComponent);

  stopwatchForSlot(slot: number) {
    return this.panels().find(p => p.slot() === slot)?.stopwatch();
  }
}
