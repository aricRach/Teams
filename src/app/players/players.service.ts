import {inject, Injectable, signal} from '@angular/core';
import {PlayersApiService} from './players-api.service';
import {currentDate} from '../utils/date-utils';
import {Player} from './models/player.model';
import {of, take, tap} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlayersService {

  playersApiService = inject(PlayersApiService);
  // @ts-ignore
  selectedGroup = signal<null | any>(null);
  userGroups = signal<null | any[]>(null);
  isAdmin = signal(false);
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
  teams = signal(structuredClone(this.skeleton));
  private teamsFromApi: any = {};

  setData(value: any) {
    this.teams.set(value);
  }

  getUserCreatedGroups() {
    if(this.userGroups()) {
      return of(this.userGroups());
    }
    return this.playersApiService.getUserCreatedGroups().pipe(take(1), tap((groups) => {
      this.userGroups.set(groups)
    }));
  }

  // updateStatisticsWithDefaults(teams: any) {
  //   const defaultStatistics = {
  //     goals: 0,
  //     wins: 0,
  //     loses: 0,
  //     games: 0,
  //     draws: 0,
  //   };
  //
  //   Object.keys(teams).forEach(teamKey => {
  //     const team = teams[teamKey];
  //
  //     if (team.players && Array.isArray(team.players)) {
  //       team.players.forEach((player: any) => {
  //         player.statistics = player.statistics || {};
  //         player.statistics[currentDate] = player.statistics[currentDate] || { ...defaultStatistics };
  //       });
  //     }
  //   });
  //
  //   return teams;
  // }

  setPlayersIntoDataBase() {
    this.playersApiService.addOrUpdatePlayers(this.selectedGroup().id, this.flattenPlayers());
  }

  flattenPlayers(): Player[] {
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
    const cachedTeams = this.teamsFromApi[this.selectedGroup().id]
       if(cachedTeams) {
         this.teams.set(cachedTeams);
         return of(cachedTeams);
       }
      return this.playersApiService.getAllPlayers(this.selectedGroup().id).pipe(
         take(1),
        tap((allPlayers) => {
          const teams = structuredClone(this.skeleton);

          for (const player of allPlayers) {
            // @ts-ignore
            teams[player.team].players.push(player);
            // @ts-ignore
            teams[player.team].totalRating += player.rating;
          }
          this.teamsFromApi[this.selectedGroup().id] = teams;
          this.teams.set(teams);
        })
       )
    }
}
