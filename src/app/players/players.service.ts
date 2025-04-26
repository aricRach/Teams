import {computed, inject, Injectable, linkedSignal, signal} from '@angular/core';
import {PlayersApiService} from './players-api.service';
import {Player} from './models/player.model';
import {of, take, tap} from 'rxjs';
import {SpinnerService} from '../spinner.service';
import {PopupsService} from 'ui';
import {skeleton} from './consts/teams-skeleton';

@Injectable({
  providedIn: 'root'
})
export class PlayersService {

  playersApiService = inject(PlayersApiService);
  spinnerService = inject(SpinnerService);
  popoutService = inject(PopupsService);
  // @ts-ignore
  selectedGroup = signal<null | any>(null);
  numberOfTeams = signal<number>(2);
  userGroups = signal<null | any[]>(null);
  isAdmin = signal(false);
  private teams = signal<{[key: string]: { players: Player[] }}>(structuredClone(skeleton));

   computedTeams = computed(() =>  JSON.parse(JSON.stringify(this.teams()))) // use only in drag-drop-component.

  setTeams(teams: any) {
    this.teams.set({...teams});
  }

  getUserCreatedGroups() {
    if(this.userGroups()) {
      return of(this.userGroups());
    }
    return this.playersApiService.getUserCreatedGroups().pipe(take(1), tap((groups) => {
      this.userGroups.set(groups);
    }));
  }

  setPlayersIntoDataBase(specificTeams?: any) {
    this.spinnerService.setIsLoading(true);
    return this.playersApiService.addOrUpdatePlayers(this.selectedGroup().id, this.flattenPlayers(specificTeams)).then(
      () => this.popoutService.addSuccessPopOut('Data was saved successfully.'),
    ).catch(() => this.popoutService.addSuccessPopOut('Cant save try to save locally meantime.'),).finally(
      () =>  this.spinnerService.setIsLoading(false)
    );
  }

  flattenPlayers(specificTeams?: any): Player[] {
    const playersArray: Player[] = [];
    const teams = {...specificTeams || this.teams()}
    Object.keys(teams).forEach(team => {
      // @ts-ignore
      if (teams[team].players && Array.isArray(teams[team].players)) {
        // @ts-ignore
        teams[team].players.forEach((player: any) => {
          playersArray.push({
            ...JSON.parse(JSON.stringify(player)),
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
    this.spinnerService.setIsLoading(true);
    this.playersApiService.addPlayerToGroup(this.selectedGroup().id, newPlayer).then(() => {
      this.popoutService.addSuccessPopOut(`${newPlayer.name} successfully added.`);
    }).catch(() => {
      this.popoutService.addSuccessPopOut(`cant add ${newPlayer.name},please try again later.`);
    }).finally(() => {
      this.spinnerService.setIsLoading(false);
      this.teams.update((teams: any) => {
        teams.allPlayers.players.push({name: newPlayer.name, rating: newPlayer.rating, statistics: {}})
        return {...teams}
      })
    })

    }

    getAllActivePlayers() {
      return this.playersApiService.getAllActivePlayers(this.selectedGroup().id).pipe(
         take(1),
        tap((allPlayers) => {
          const teams = Object.fromEntries(Object.entries(structuredClone(skeleton)).slice(0, this.numberOfTeams() + 1));
          for (const player of allPlayers) {
            if(teams.hasOwnProperty(player['team']))
            // @ts-ignore
            teams[player.team].players.push(player);
          }
          this.teams.set(teams);
        })
       )
    }

  updatePlayer(player: any, updateStats: boolean) {
    this.spinnerService.setIsLoading(true);
    return this.playersApiService.updatePlayerStats(this.selectedGroup().id, player.name, player, updateStats ).then(() => {
        this.popoutService.addSuccessPopOut(`${player.name} updated successfully.`);
      })
      .catch(() => this.popoutService.addErrorPopOut(`cant save in db please try later, and save locally`))
      .finally(() => {
        this.spinnerService.setIsLoading(false)
        this.teams.update((teams) => {
          for (const teamKey in teams) {
            // @ts-ignore
            const team = teams[teamKey];
            let foundPlayerIndex = team.players.findIndex((playerObj: Player) => playerObj.name.toLowerCase() === player.name.toLowerCase());

            if (foundPlayerIndex > -1) {
              team.players[foundPlayerIndex] = {...player}
              break;
            }
          }
          return {...teams};
        })
      });
  }

  async submitRatings(ratingData: Record<string, number>) {
   this.spinnerService.setIsLoading(true);
   return this.playersApiService.submitRatings(ratingData, this.selectedGroup().id).then(() => {
     this.popoutService.addSuccessPopOut(`rating were successfully updated.`);
   }).catch(() => this.popoutService.addErrorPopOut(`cant save please try later`))
     .finally(() => this.spinnerService.setIsLoading(false));
  }

  setPlayerActiveStatus(player: Player, isActive: boolean) {
    this.spinnerService.setIsLoading(true)
   return this.playersApiService.setPlayerActiveStatus(this.selectedGroup().id, player.name, isActive).then(() => {
     this.popoutService.addSuccessPopOut(`${player.name} moved to ${isActive ? 'active' : 'inactive'}`);
     if(isActive) { // if you want to make the player active you need to fetch again.
       debugger
       this.getAllActivePlayers();
       return;
     }
     debugger
     if(!isActive) { // if you want to remove delete it from the specific team.
       debugger
        this.teams.update((teams) => {
          for (const teamKey in teams) {
            // @ts-ignore
            const team = teams[teamKey];
            let foundPlayerIndex = team.players.findIndex(
              (playerObj: Player) => playerObj.name.toLowerCase() === player.name.toLowerCase()
            );
            if (foundPlayerIndex > -1) {
                team.players.splice(foundPlayerIndex, 1);
              break;
            }
          }
          return { ...teams };
        });
      }
   }).catch(() => {
     this.popoutService.addErrorPopOut(`please try again later`);
   })
     .finally(() => this.spinnerService.setIsLoading(false));
  }

  getTeams(): any {
   return structuredClone(this.teams())
  }
}
