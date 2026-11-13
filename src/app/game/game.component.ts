import { Component, inject, signal } from '@angular/core';
import {GameLayoutComponent} from '../shared/layouts/game-layout/game-layout.component';
import { PlayersService } from '../players/players.service';
import { AdminControlService } from '../user/admin-control.service';
import { GameService } from './game.service';
import { SingleGameComponent } from './single-game/single-game.component';
import { LeagueGameComponent } from './league-game/league-game.component';
import { CaptureMediaComponent } from '../media/capture-media/capture-media.component';
import { ModalComponent } from '../../modals/modal/modal.component';
import { AuditTrailComponent } from '../audit-trail/audit-trail.component';


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
  protected gameService = inject(GameService);

  protected isAuditTrailModalVisible = signal(false);

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
}
