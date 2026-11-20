import {computed, inject, Injectable, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {PlayersService} from '../players/players.service';
import {GameDetails, GameStatus, MatchEventsManagerService} from '../match-event-manager/services/match-events-manager.service';
import {NavigationService} from '../shared/navigation/navigation.service';
import {ComputedStatisticsService} from '../statistics/services/computed-statistics.service';
import {isScoringEvent} from '../match-event-manager/utils/scoring.util';
import {collapseExtraTeams} from '../utils/collapse-extra-teams.util';
import {ModalsService} from 'ui';

export type GameMode = 'single' | 'league';

@Injectable()
export class GameService {

  playersService = inject(PlayersService);
  matchEventsService = inject(MatchEventsManagerService);
  navigationService = inject(NavigationService);
  computedStatsService = inject(ComputedStatisticsService);
  private modalsService = inject(ModalsService);

  computedStats = computed(() => this.computedStatsService.statsMap())

  // A running match keeps its own mode; otherwise always start in League.
  readonly mode = signal<GameMode>(this.matchEventsService.liveMode() ?? 'league');
  readonly teamCountOptions = [2, 3, 4];
  // The game page's team count. The game services and the layout read it from here.
  readonly teamCount = this.playersService.numberOfTeams;

  // While a match is running, neither the mode nor the number of teams can change.
  readonly isSetupLocked = computed(() => this.matchEventsService.liveMode() !== null);

  setMode(mode: GameMode): void {
    if (this.isSetupLocked()) return;
    this.mode.set(mode);
  }

  setTeamCount(count: number): void {
    if (this.isSetupLocked()) return;
    const teams = this.playersService.getTeams();
    const shownTeams = collapseExtraTeams(teams, count);
    const bench = this.playersService.allPlayersLabel;
    const movedCount = shownTeams[bench].players.length - (teams[bench]?.players.length ?? 0);
    if (movedCount === 0) {
      this.playersService.setNumberOfTeams(count);
      return;
    }

    // Lowering the count moves the hidden teams' players to the bench and saves it, so every page agrees.
    this.modalsService.openConfirmModal({
      title: 'Lower the number of teams?',
      confirmBtn: 'move to bench',
      description: `${movedCount} players from the removed teams will move to the bench.`,
    }).afterClosed().subscribe((confirmed: string) => {
      if (!confirmed) return;
      this.playersService.setNumberOfTeams(count);
      this.playersService.setTeams(shownTeams);
      void this.playersService.savePlayers.run(undefined, true);
    });
  }

  readonly teamBuilderUrl = computed(() => this.playersService.groupUrl('teams'));

  async endGame(teams: any, slot = 1) {
    let team1Score = 0;
    let team2Score = 0;
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.matchEventsService.liveMatchIdFor(slot);
    if (groupId && matchId) {
      try {
        const eventsObservable = (this.matchEventsService as any).matchEventsApiService.getEvents(groupId, matchId);
        const events = (await firstValueFrom(eventsObservable)) as any[];
        events.forEach((ev: any) => {
          if (isScoringEvent(ev)) {
            if (ev.teamKey === teams.team1) team1Score++;
            if (ev.teamKey === teams.team2) team2Score++;
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    let gameStatus: GameStatus = GameStatus.Decided;
    let winner = '';
    let loser = '';
    let wonTeamScore = 0;
    let loseTeamScore = 0;

    if (team1Score > team2Score) {
      winner = teams.team1;
      loser = teams.team2;
      wonTeamScore = team1Score;
      loseTeamScore = team2Score;
    } else if (team2Score > team1Score) {
      winner = teams.team2;
      loser = teams.team1;
      wonTeamScore = team2Score;
      loseTeamScore = team1Score;
    } else {
      gameStatus = GameStatus.Draw;
      winner = teams.team1;
      loser = teams.team2;
      wonTeamScore = team1Score;
      loseTeamScore = team2Score;
    }

    const gameDetails: GameDetails = {gameStatus, winner, loser, wonTeamScore, loseTeamScore};

    await this.matchEventsService.endGameAndPersist(gameDetails, slot);
    // Moves on the game page aren't saved one by one: keep the teams that just played.
    void this.playersService.savePlayers.run(undefined, true);

    if (!this.matchEventsService.hasAnyLiveMatch()) {
      try {
        await this.playersService.setFantasyMetaIsActive(false);
      } catch (e) {
        console.error('Failed to clear fantasy meta isActive flag:', e);
      }
      this.navigationService.unlockNavigation();
    }
  }
}
