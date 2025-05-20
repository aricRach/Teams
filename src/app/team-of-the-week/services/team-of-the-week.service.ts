import {computed, inject, Injectable, resource, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {TeamOfTheWeekApiService} from './team-of-the-week-api.service';
import {StatisticsService} from '../../statistics/services/statistics.service';
import {PopupsService} from 'ui';
import {SpinnerService} from '../../spinner.service';


export interface PlayerWeekStates {
  name: string,
  totalGoals: number,
  totalGames: number,
  totalWins: number,
  team: string
}

@Injectable({
  providedIn: 'root'
})
export class TeamOfTheWeekService {

  playersService = inject(PlayersService);
  statisticService = inject(StatisticsService);
  teamOfTheWeekApiService = inject(TeamOfTheWeekApiService);
  popupsService = inject(PopupsService);
  spinnerService = inject(SpinnerService);

  totwResource = resource({
    request: () => ({date: this.statisticService.getSelectedDate()}),
    loader: ({request}) => this.getTeamOfTheWeek(request.date)
  });

  totwData = computed(() => this.totwResource.value());


  calculateWeekStates(date: string) {
    const allPlayers = this.playersService.flattenPlayers();
    const setOfTeams = new Set();
    const players =  allPlayers.filter((player) => !!player.statistics[date] && player.statistics[date].games > 0).map(player => {
      const dateStats = player.statistics[date];
      setOfTeams.add(player.team)
        return {name: player.name, team: player.team, totalGoals: dateStats.goals, totalGames: dateStats.games, totalWins: dateStats.wins}
    })
    return {players, teamSize:  Math.floor(players.length/setOfTeams.size)}
  }

  getTeamOfTheWeek(date: string) {
    if(date  === this.statisticService.selectAllLabel()) {
      this.popupsService.addErrorPopOut('Please select a specific date');
      return Promise.resolve(null);
    } else {
      this.spinnerService.setIsLoading(true);
      const weekStates = this.calculateWeekStates(date);
      return this.teamOfTheWeekApiService.generateAiTotw(date, weekStates.players, weekStates.teamSize ).finally(() => {
        this.spinnerService.setIsLoading(false)
      });
    }

  }
}
