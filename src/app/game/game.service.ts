import {computed, inject, Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {PlayersService} from '../players/players.service';
import {GameDetails, GameStatus, MatchEventsManagerService} from '../match-event-manager/services/match-events-manager.service';
import {NavigationService} from '../shared/navigation/navigation.service';
import {ComputedStatisticsService} from '../statistics/services/computed-statistics.service';

@Injectable()
export class GameService {

  playersService = inject(PlayersService);
  matchEventsService = inject(MatchEventsManagerService);
  navigationService = inject(NavigationService);
  computedStatsService = inject(ComputedStatisticsService);

  computedStats = computed(() => this.computedStatsService.statsMap())

  async endGame(teams: any) {
    let team1Score = 0;
    let team2Score = 0;
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.matchEventsService.liveMatchId();
    if (groupId && matchId) {
      try {
        const eventsObservable = (this.matchEventsService as any).matchEventsApiService.getEvents(groupId, matchId);
        const events = (await firstValueFrom(eventsObservable)) as any[];
        events.forEach((ev: any) => {
          if (ev.type === 'player_goal' && !ev.deletedAt) {
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

    await this.matchEventsService.endGameAndPersist(gameDetails);
    await this.playersService.setFantasyMetaIsActive(false);

    this.navigationService.unlockNavigation();
  }
}
