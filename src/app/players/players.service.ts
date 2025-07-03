import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersApiService} from './players-api.service';
import {Player} from './models/player.model';
import {of, take, tap} from 'rxjs';
import {SpinnerService} from '../spinner.service';
import {PopupsService} from 'ui';
import {skeleton} from './consts/teams-skeleton';
import {MembersService} from '../admin/services/members.service';

@Injectable({
  providedIn: 'root'
})
export class PlayersService {

  playersApiService = inject(PlayersApiService);
  membersService = inject(MembersService);
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
    return playersArray.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

    getAllActivePlayers() {
      return this.playersApiService.getAllActivePlayers(this.selectedGroup().id).pipe(
         take(1),
        tap((allPlayers) => {
          const teams = Object.fromEntries(Object.entries(structuredClone(skeleton)).slice(0, this.numberOfTeams() + 1));
          for (const player of allPlayers) {
            if(teams.hasOwnProperty(player['team'])) {
              // @ts-ignore
              teams[player.team].players.push(player);
            } else {
              // @ts-ignore
              teams['allPlayers'].players.push(player);
            }

          }
          this.teams.set(teams);
        })
       )
    }

  async updatePlayer(player: Player, editedPlayer: Player, updateStats: boolean): Promise<void> {
    this.spinnerService.setIsLoading(true);

    try {
      await this.playersApiService.updatePlayerStats(
        this.selectedGroup().id,
        editedPlayer,
        updateStats
      );

      this.updatePlayerSignal(editedPlayer);
      this.popoutService.addSuccessPopOut(`${editedPlayer.name} updated successfully.`);

      if(player.email && editedPlayer.email && player.email !== editedPlayer.email) {
        await this.membersService.replaceEmail(this.selectedGroup().id, player.email, editedPlayer.email);
      } else if(!player.email && editedPlayer.email) {
        await this.membersService.addMember(this.selectedGroup().id, editedPlayer.email);
      } else if(!editedPlayer.email && player.email) {
        await this.membersService.removeMember(this.selectedGroup().id, player.email)
      }
    } catch {
      this.popoutService.addErrorPopOut(`Can't save to database. Please try again later or save locally.`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }

  async submitRatings(ratingData: Record<string, number>) {
   this.spinnerService.setIsLoading(true);
   return this.playersApiService.submitRatings(ratingData, this.selectedGroup().id).then(() => {
     this.popoutService.addSuccessPopOut(`rating were successfully updated.`);
   }).catch(() => this.popoutService.addErrorPopOut(`cant save please try later`))
     .finally(() => this.spinnerService.setIsLoading(false));
  }

  async setPlayerActiveStatus(player: Player, isActive: boolean) {
    this.spinnerService.setIsLoading(true)
   return this.playersApiService.setPlayerActiveStatus(this.selectedGroup().id, player.id, isActive).then(async () => {
     this.popoutService.addSuccessPopOut(`${player.name} moved to ${isActive ? 'active' : 'inactive'}`);
     if(isActive) { // if you want to make the player active you need to fetch again.
       this.getAllActivePlayers();
       return;
     }
     if(!isActive) { // if you want to remove delete it from the specific team.
       await this.membersService.removeMember(this.selectedGroup().id, player.email);
        this.removePlayerSignal(player);
      }
   }).catch(() => {
     this.popoutService.addErrorPopOut(`please try again later`);
   })
     .finally(() => this.spinnerService.setIsLoading(false));
  }

  getTeams(): any {
   return structuredClone(this.teams())
  }

  async getDraftSessionsByCreator(): Promise<any[]> {
   this.spinnerService.setIsLoading(true);
   return this.playersApiService.getDraftSessionsByCreator(this.selectedGroup().id).finally(() => {
     this.spinnerService.setIsLoading(false)
   })
  }

  updatePlayerSignal(player: Player) {
      this.teams.update((teams) => {
        for (const teamKey in teams) {
          // @ts-ignore
          const team = teams[teamKey];
          let foundPlayerIndex = team.players.findIndex((playerObj: Player) => playerObj.id === player.id);

          if (foundPlayerIndex > -1) {
            team.players[foundPlayerIndex] = {...player}
            break;
          }
        }
        return {...teams};
      })
    }

    removePlayerSignal(player: Player) {
      this.teams.update((teams) => {
        for (const teamKey in teams) {
          // @ts-ignore
          const team = teams[teamKey];
          let foundPlayerIndex = team.players.findIndex(
            (playerObj: Player) => playerObj.id === player.id
          );
          if (foundPlayerIndex > -1) {
            team.players.splice(foundPlayerIndex, 1);
            break;
          }
        }
        return { ...teams };
      });
    }
}
