import {inject, Injectable} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {TeamOfTheWeekApiService} from './team-of-the-week-api.service';


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
  teamOfTheWeekApiService = inject(TeamOfTheWeekApiService);

  calculateWeekStates(date: string) {
    const allPlayers = this.playersService.flattenPlayers();
    return allPlayers.filter((player) => !!player.statistics[date] && player.statistics[date].games > 0).map(player => {
      const dateStats = player.statistics[date];
        return {name: player.name, team: player.team, totalGoals: dateStats.goals, totalGames: dateStats.games, totalWins: dateStats.wins}
    })
  }

  getTeamOfTheWeek(date: string) {
    return this.teamOfTheWeekApiService.generateAiTotw(date, this.calculateWeekStates(date));
  }
}
