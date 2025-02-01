import {inject, Injectable, signal} from '@angular/core';
import {Player} from '../app.component';
import {PlayersApiService} from './players-api.service';
import {currentDate} from '../utils/date-utils';

@Injectable({
  providedIn: 'root'
})
export class PlayersService {

  playersApiService = inject(PlayersApiService);

  skeleton = {
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
  }
  teams = signal({...this.skeleton})

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

  setPlayersIntoDataBase() {
    console.log(this.teams());
    this.playersApiService.savePlayers(this.flattenPlayers());
  }

  private flattenPlayers(): Player[] {
    const playersArray: Player[] = [];

    Object.keys(this.teams()).forEach(team => {
      // @ts-ignore
      if (this.teams()[team].players && Array.isArray(this.teams()[team].players)) {
        // @ts-ignore
        this.teams()[team].players.forEach((player: any) => {
          playersArray.push({
            ...player,
            team: team, // Add team name for reference
          });
        });
      }
    });

    return playersArray;
  }

  addNewPlayer(newPlayer: Player) {
    const allPlayersArray = this.flattenPlayers();
    const isPlayerExist = allPlayersArray.some(player => player.name.toLowerCase() === newPlayer.name.toLowerCase());
    if(isPlayerExist) {
      alert(`❌ player with name: ${newPlayer.name} already exist`);
      return;
    }
      this.teams.update((teams: any) => {
        teams.allPlayers.players.push({
          name: newPlayer.name, rating: newPlayer.rating, statistics: {
            [currentDate]: {
              goals: 0,
              wins: 0,
              loses: 0,
              games: 0,
              draws: 0,
            }
          }
        })
        return teams
      })
    }

    getAllPlayersFromDatabase() {
       this.playersApiService.getAllPlayers().then((allPlayers) => {

        const teams = {...this.skeleton};

        for (const player of allPlayers) {
          // @ts-ignore
          teams[player.team].players.push(player);
          // @ts-ignore
          teams[player.team].totalRating += player.rating;
        }
         this.teams.set(teams);
       })
    }
}
