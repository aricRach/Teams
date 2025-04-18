import {computed, inject, Injectable, resource, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {TeamOfTheWeekApiService} from './team-of-the-week-api.service';
import {StatisticsService} from '../../statistics/services/statistics.service';
import {PopupsService} from 'ui';


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

  totwResource = resource({
    request: () => ({date: this.statisticService.getSelectedDate()}),
    loader: ({request}) => this.getTeamOfTheWeek(request.date)
  });

  totwData = computed(() => this.totwResource.value());


  calculateWeekStates(date: string) {
    const allPlayers = this.playersService.flattenPlayers();
    return allPlayers.filter((player) => !!player.statistics[date] && player.statistics[date].games > 0).map(player => {
      const dateStats = player.statistics[date];
        return {name: player.name, team: player.team, totalGoals: dateStats.goals, totalGames: dateStats.games, totalWins: dateStats.wins}
    })
  }

  getTeamOfTheWeek(date: string) {
    if(date  === this.statisticService.selectAllLabel()) {
      this.popupsService.addErrorPopOut('Please select a specific date');
    }
    const players = this.calculateWeekStates(date);
    console.log(players);
    return this.teamOfTheWeekApiService.generateAiTotw(date, players);
  }
}
