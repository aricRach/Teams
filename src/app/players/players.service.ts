import {Injectable, signal} from '@angular/core';
import {Player} from '../app.component';

@Injectable({
  providedIn: 'root'
})
export class PlayersService {

  teams = signal ({
    teamA: {
      players: [] as Player [],
      totalRating: 0
    },
    teamB: {
      players: [] as Player [],
      totalRating: 0,
    },
    teamC: {
      players: [] as Player [],
      totalRating: 0,
    },
    allPlayers: {
      players: [] as Player [],
      totalRating: 0,
    }
  })

  setData(value: any) {
    this.teams.set(value);
  }

  updateStatisticsWithDefaults(teams: any, date: string) {
    const defaultStatistics = {
      goals: 0,
      wins: 0,
      loses: 0,
      games: 0,
      draws: 0,
    };

    Object.keys(teams).forEach(teamKey => {
      const team = teams[teamKey];

      if (team.players && Array.isArray(team.players)) {
        team.players.forEach((player: any) => {
          player.statistics = player.statistics || {};
          player.statistics[date] = player.statistics[date] || { ...defaultStatistics };
        });
      }
    });

    return teams;
  }
  constructor() { }
}
