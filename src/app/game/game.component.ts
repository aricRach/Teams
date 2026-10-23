import { Component, computed, inject, signal } from '@angular/core';
import {GameLayoutComponent} from '../shared/layouts/game-layout/game-layout.component';
import { PlayersService } from '../players/players.service';
import { MatchEventsManagerService } from '../match-event-manager/services/match-events-manager.service';
import { AdminControlService } from '../user/admin-control.service';
import { GameService } from './game.service';
import { SingleGameComponent } from './single-game/single-game.component';
import { LeagueGameComponent } from './league-game/league-game.component';
import { CaptureMediaComponent } from '../media/capture-media/capture-media.component';
import { ModalComponent } from '../../modals/modal/modal.component';
import { AuditTrailComponent } from '../audit-trail/audit-trail.component';

type GameMode = 'single' | 'league';

@Component({
  selector: 'app-game',
  imports: [SingleGameComponent, LeagueGameComponent, CaptureMediaComponent, ModalComponent, AuditTrailComponent, GameLayoutComponent],
  templateUrl: './game.component.html',
  standalone: true,
  providers: [GameService],
  styleUrl: './game.component.scss'
})
export class GameComponent {
  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);
  private matchEventsService = inject(MatchEventsManagerService);

  private storageKey = computed(() => `gameMode-${this.playersService.selectedGroup()?.id ?? 'default'}`);

  mode = signal<GameMode>(this.matchEventsService.liveMode() ?? this.readStoredMode());

  toggleDisabled = computed(() => this.matchEventsService.liveMode() !== null);

  protected isAuditTrailModalVisible = signal(false);

  setMode(mode: GameMode): void {
    if (this.toggleDisabled() || mode === this.mode()) return;
    this.mode.set(mode);
    try {
      localStorage.setItem(this.storageKey(), mode);
    } catch {
      /* localStorage unavailable - fall back to in-memory only */
    }
  }

  save(): void {
    localStorage.setItem(`teams-${this.playersService.selectedGroup().id}`, JSON.stringify(this.playersService.getTeams()));
  }

  load(): void {
    const savedTeams = localStorage.getItem(`teams-${this.playersService.selectedGroup().id}`);
    if (savedTeams) {
      const teamsObj = JSON.parse(savedTeams);
      this.playersService.setTeams({ ...teamsObj });
    }
  }

  saveGlobal(): void {
    void this.playersService.savePlayers.run();
  }

  private readStoredMode(): GameMode {
    try {
      return localStorage.getItem(this.storageKey()) === 'league' ? 'league' : 'single';
    } catch {
      return 'single';
    }
  }
}
