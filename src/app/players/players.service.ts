import {computed, inject, Injectable, signal} from '@angular/core';
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
  userGroups = signal<null | any[]>(null);
  isAdmin = signal(false);
  private teams = signal(structuredClone(skeleton));

   computedTeams = computed(() => { // use only in drag-drop-component.
    console.log('computed')
    return JSON.parse(JSON.stringify(this.teams()))
  });

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

    getAllPlayersFromDatabase() {
      return this.playersApiService.getAllPlayers(this.selectedGroup().id).pipe(
         take(1),
        tap((allPlayers) => {
          const teams = structuredClone(skeleton);
          for (const player of allPlayers) {
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

  // rebuildTeams(): any {
  //   const teams = structuredClone(skeleton)
  //   const playersArray = this.flattenPlayers();
  //   playersArray.forEach(player => {
  //     const teamName = player.team;
  //     teams[teamName].players.push({ ...structuredClone(player) });
  //   });
  //   return teams;
  // }

  getTeams(): any {
   return structuredClone(this.teams())
  }
}
