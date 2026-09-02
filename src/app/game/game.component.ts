import {Component, computed, inject, signal, viewChild} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlayersService } from '../players/players.service';

import { PlayersDragDropTableComponent } from '../players/players-drag-drop-table/players-drag-drop-table.component';
import { StopwatchComponent } from '../stopwatch/stopwatch.component';
import { ModalComponent } from '../../modals/modal/modal.component';
import { Player } from '../players/models/player.model';
import { AuditTrailComponent } from '../audit-trail/audit-trail.component';
import { AdminControlService } from '../user/admin-control.service';
import { AddNewPlayerComponent } from '../add-new-player/add-new-player.component';
import { CaptureMediaComponent } from '../media/capture-media/capture-media.component';
import { MatchEventsManagerService } from '../match-event-manager/services/match-events-manager.service';
import {GameService} from './game.service';
import {NavigationService} from '../shared/navigation/navigation.service';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-game',
  imports: [ReactiveFormsModule, PlayersDragDropTableComponent, CaptureMediaComponent, StopwatchComponent, ModalComponent, FormsModule, AuditTrailComponent, AddNewPlayerComponent, RouterLink],
  templateUrl: './game.component.html',
  standalone: true,
  providers: [GameService],
  styleUrl: './game.component.scss'
})
export class GameComponent {
  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);
  matchEventsService = inject(MatchEventsManagerService);
  gameService = inject(GameService);
  navigationService = inject(NavigationService);

  isMovePlayersLocked = signal(false);
  playingTeams = signal<string[]>([]);

  private stopwatchRef = viewChild(StopwatchComponent);

  protected isAuditTrailModalVisible = signal(false);

  lockIcon = computed(() =>
    this.isMovePlayersLocked() ? 'assets/icons/unlock.svg' : 'assets/icons/lock.svg')

  teams = computed(() => this.playersService.getTeams())
  save() {
    localStorage.setItem(`teams-${this.playersService.selectedGroup().id}`, JSON.stringify(this.playersService.getTeams()));
  }

  load() {
    const savedTeams = localStorage.getItem(`teams-${this.playersService.selectedGroup().id}`);
    if (savedTeams) {
      const teamsObj = JSON.parse(savedTeams);
      this.playersService.setTeams({ ...teamsObj });
    }
  }

  async endGame(teams: any) {
    await this.gameService.endGame(teams);
    this.isMovePlayersLocked.set(false);
    this.stopwatchRef()?.reset();
  }

  saveGlobal() {
    this.playersService.savePlayers();
  }

  updateTeams(teams: any) {
    this.playersService.setTeams(teams);
  }

  onTimerStart(): void {
    if (this.playingTeams().length !== 2) {
      return;
    }
    this.isMovePlayersLocked.set(true);
    this.navigationService.lockNavigation();
    void this.matchEventsService.onTimerStartedForMatch();
  }

  onTimerReset(): void {
    void this.matchEventsService.abandonLiveMatchOnReset();
    this.isMovePlayersLocked.set(false);
    this.navigationService.unlockNavigation();
  }

  async endGameFromTimer() {
    if (this.playingTeams().length === 2) {
      await this.endGame({
        team1: this.playingTeams()[0],
        team2: this.playingTeams()[1]
      });
      this.playingTeams.set([]);
    }
  }

  recordGoalFromTimerHandler = (goalRecord: {player: Player, teamKey: string}) => {
    const ms = this.stopwatchRef()?.getElapsedMs() ?? 0;
    void this.matchEventsService.recordPlayerGoalFromTimer(goalRecord.player, goalRecord.teamKey, ms);
  }

  revealTeams() {
    void this.gameService.revealTeams();
  }
}
