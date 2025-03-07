import {inject, Injectable, signal} from '@angular/core';
import {PlayersApiService} from './players-api.service';
import {currentDate} from '../utils/date-utils';
import {Player} from './models/player.model';
import {of, take, tap} from 'rxjs';
import {SpinnerService} from '../spinner.service';
import {PopupsService} from 'ui';

@Injectable({
  providedIn: 'root'
})
export class PlayersService {

  playersApiService = inject(PlayersApiService);
  spinnerService = inject(SpinnerService);
  popoutService = inject(PopupsService);
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

  setTeams(value: any) {
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

  setPlayersIntoDataBase(specificTeams?: any) {
    this.spinnerService.setIsLoading(true);
    this.playersApiService.addOrUpdatePlayers(this.selectedGroup().id, this.flattenPlayers(specificTeams)).then(
      () => this.popoutService.addSuccessPopOut('Data was saved successfully.'),
    ).catch(() => this.popoutService.addSuccessPopOut('Cant save try to save locally meantime.'),).finally(
      () =>  this.spinnerService.setIsLoading(false)
    );
  }

  flattenPlayers(specificTeams?: any): Player[] {
    const playersArray: Player[] = [];
    const teams = specificTeams || this.teams()
    Object.keys(teams).forEach(team => {
      // @ts-ignore
      if (teams[team].players && Array.isArray(teams[team].players)) {
        // @ts-ignore
        teams[team].players.forEach((player: any) => {
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

  updatePlayer(player: any) {
    this.spinnerService.setIsLoading(true);
    this.playersApiService.updatePlayerStats(this.selectedGroup().id, player.name, player )
      .then(() => this.popoutService.addSuccessPopOut(`${player.name} goals updated successfully.`))
      .catch(() => this.popoutService.addErrorPopOut(`cant save goals for ${player.name}, please try later`))
      .finally(() => this.spinnerService.setIsLoading(false));
  }
}
