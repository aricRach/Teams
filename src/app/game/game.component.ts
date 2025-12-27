import {Component, computed, inject, signal} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {PlayersService} from '../players/players.service';
import {GameDetails, GameDetailsComponent} from '../game-details/game-details.component';
import {currentDate} from '../utils/date-utils';
import {CommonModule} from '@angular/common';
import {PlayersDragDropTableComponent} from '../players/players-drag-drop-table/players-drag-drop-table.component';
import {StopwatchComponent} from '../stopwatch/stopwatch.component';
import {ModalComponent} from '../../modals/modal/modal.component';
import {Player} from '../players/models/player.model';
import {AuditTrailService} from '../audit-trail/services/audit-trail.service';
import {AuditTrailComponent} from '../audit-trail/audit-trail.component';
import {AdminControlService} from '../user/admin-control.service';
import {AddNewPlayerComponent} from '../add-new-player/add-new-player.component';
import {CaptureMediaComponent} from '../media/capture-media/capture-media.component';

@Component({
  selector: 'app-game',
  imports: [ReactiveFormsModule, CommonModule, PlayersDragDropTableComponent, CaptureMediaComponent,
    StopwatchComponent, ModalComponent, FormsModule, GameDetailsComponent, AuditTrailComponent, AddNewPlayerComponent],
  templateUrl: './game.component.html',
  standalone: true,
  styleUrl: './game.component.scss'
})
export class GameComponent {
  playersService = inject(PlayersService);
  auditTrailService = inject(AuditTrailService);
  adminControlService = inject(AdminControlService);
  readonly originalTeamNames = computed(() =>
    Object.keys(this.playersService.getTeams() ?? {}).filter(key => key !== 'allPlayers').slice(0, this.playersService.numberOfTeams())
  );
  isMovePlayersLocked = signal(false);
  isTeamWinModalVisible = signal(false);

  protected isAuditTrailModalVisible = signal(false);

  lockIcon = computed(() =>
    this.isMovePlayersLocked() ? 'assets/icons/unlock.svg' : 'assets/icons/lock.svg')

  teams = computed(() => this.playersService.getTeams())
  save() {
    localStorage.setItem(`teams-${this.playersService.selectedGroup().id}`, JSON.stringify(this.playersService.getTeams()));
  }

  load() {
    const savedTeams = localStorage.getItem(`teams-${this.playersService.selectedGroup().id}`);
    if(savedTeams) {
      const teamsObj = JSON.parse(savedTeams);
      this.playersService.setTeams({...teamsObj});
    }
  }


  async endGame(gameDetails: GameDetails) {
    const teams = this.playersService.getTeams();
    // @ts-ignore
    const winners = teams[gameDetails.winner].players.map((player: Player) => {
      const currentStats = player.statistics[currentDate] || {};
      const goalsConceded = gameDetails.loseTeamScore;
      const updatedStatistics = {
        ...player.statistics,
        [currentDate]: {
          ...currentStats,
          wins: (currentStats.wins || 0) + (gameDetails.gameStatus === 'decided' ? 1 : 0),
          games: (currentStats.games || 0) + 1,
          draws: (currentStats.draws || 0) + (gameDetails.gameStatus === 'decided' ? 0 : 1),
          goals: (currentStats.goals || 0),
          loses: (currentStats.loses || 0),
          goalsConceded: (currentStats.goalsConceded || 0) + goalsConceded
        },
      };

      return {
        ...player,
        statistics: updatedStatistics,
      };
    });

    // @ts-ignore
    const losers = teams[gameDetails.loser].players.map((player: Player) => {
      const currentStats = player.statistics[currentDate] || {};
      const goalsConceded = gameDetails.wonTeamScore;

      const updatedStatistics = {
        ...player.statistics,
        [currentDate]: {
          ...currentStats,
          loses: (currentStats.loses || 0) + (gameDetails.gameStatus === 'decided' ? 1 : 0),
          games: (currentStats.games || 0) + 1,
          draws: (currentStats.draws || 0) + (gameDetails.gameStatus === 'decided' ? 0 : 1),
          wins: (currentStats.wins || 0),
          goals: (currentStats.goals || 0),
          goalsConceded: (currentStats.goalsConceded || 0) + goalsConceded
        },
      };

      return {
        ...player,
        statistics: updatedStatistics,
      };
    });

    // Update the teams
    this.playersService.setTeams({
      ...teams,
      // @ts-ignore
      [gameDetails.winner]: {...teams[gameDetails.winner], players: winners},
      // @ts-ignore
      [gameDetails.loser]: {...teams[gameDetails.loser], players: losers},
    });

    this.isTeamWinModalVisible.set(false);
    // save specific teams that played not good enough if i didnt clicked save global. because it is not saved my players moved from team to another team.
    // it saved only the statistics.
    // this.playersService.setPlayersIntoDataBase({[gameDetails.winner]: {players: winners}, [gameDetails.loser]: {players: losers}})
    this.playersService.savePlayers().then(() => {
      if (gameDetails.gameStatus === 'decided') {
        this.auditTrailService.addAuditTrail(`winner: ${gameDetails.winner} - loser: ${gameDetails.loser}`)
      } else {
        this.auditTrailService.addAuditTrail(`draw: ${gameDetails.winner} - ${gameDetails.loser}`)
      }
    });

    await this.playersService.setFantasyMetaIsActive(false);
  }

  saveGlobal() {
    this.playersService.savePlayers();
  }

  updateTeams(teams: any) {
    this.playersService.setTeams(teams);
  }
}
