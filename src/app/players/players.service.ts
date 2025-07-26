import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersApiService} from './players-api.service';
import {Player} from './models/player.model';
import {finalize, of, take, tap} from 'rxjs';
import {SpinnerService} from '../spinner.service';
import {PopupsService} from 'ui';
import {skeleton} from './consts/teams-skeleton';
import {MembersService} from '../admin/services/members.service';
import {DuplicatePlayerError} from './errors/duplicate-player-error';

export interface PlayerStatsUpdate {
  id: string;
  date: string;
  stats: Record<string, any>;
};
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
  allPlayersLabel = 'allPlayers';

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

  getAllPlayers() {
     this.spinnerService.setIsLoading(true);
     return this.playersApiService.getAllPlayers(this.selectedGroup().id)
       .pipe(finalize(() => this.spinnerService.setIsLoading(false)));
  }

  savePlayers(specificTeams?: any) {
    this.spinnerService.setIsLoading(true);
    return this.playersApiService.savePlayers(this.selectedGroup().id, this.flattenPlayers(specificTeams)).then(
      () => this.popoutService.addSuccessPopOut('Data was saved successfully.'),
    ).catch(() => this.popoutService.addSuccessPopOut('Cant save try to save locally meantime.'),).finally(
      () =>  this.spinnerService.setIsLoading(false)
    );
  }

  flattenPlayers(specificTeams?: any): Player[] {
    const playersArray: Player[] = [];
    const teams = {...specificTeams || this.teams()}
    Object.keys(teams).forEach(team => {
      if (teams[team].players && Array.isArray(teams[team].players)) {
        teams[team].players
          .filter((p: Player) => p.isActive)
          .forEach((player: Player) => {
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

  async updatePlayerStats(editedPlayer: Player): Promise<void> {
    this.spinnerService.setIsLoading(true);
    try {
      await this.playersApiService.updatePlayerStats(
        this.selectedGroup().id,
        editedPlayer.id,
        editedPlayer.statistics
      );
      this.updatePlayerSignal(editedPlayer);
      this.popoutService.addSuccessPopOut(`${editedPlayer.name} updated successfully.`);
    } catch {
      this.popoutService.addErrorPopOut(`Can't save to database. Please try again later or save locally.`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }

  async updatePlayerDetails(player: Player, editedPlayer: Player): Promise<void> {
    this.spinnerService.setIsLoading(true);

    try {
      await this.playersApiService.updatePlayerDetails(this.selectedGroup().id, editedPlayer, player);
      this.updatePlayerSignal(editedPlayer);
      this.popoutService.addSuccessPopOut(`${editedPlayer.name} updated successfully.`);

      if(player.email && editedPlayer.email && player.email !== editedPlayer.email) {
        await this.membersService.replaceEmail(this.selectedGroup().id, player.email, editedPlayer.email);
      } else if(!player.email && editedPlayer.email) {
        await this.membersService.addMember(this.selectedGroup().id, editedPlayer.email);
      } else if(!editedPlayer.email && player.email) {
        await this.membersService.removeMember(this.selectedGroup().id, player.email)
      }
    }  catch (error: any) {
      if (error instanceof DuplicatePlayerError) {
        this.popoutService.addErrorPopOut(error.message);
      } else {
        this.popoutService.addErrorPopOut(`Failed to add ${player.name}. Please try again later.`);
      }
    }
    finally {
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
       this.getAllActivePlayers().subscribe(() => {});
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

  async deleteDayStatistics(day: string) {
     this.spinnerService.setIsLoading(true);
     return this.playersApiService.deleteDayStatistics(this.selectedGroup().id, day)
       .catch(() => {
       this.popoutService.addErrorPopOut('Something went wrong, please try again later')
     })
       .finally(()=> {
       this.spinnerService.setIsLoading(false)
     })
  }

  removeDraftSession(sessionId: string) {
     this.spinnerService.setIsLoading(true);
     return this.playersApiService.removeDraftSession(this.selectedGroup().id, sessionId).then(() => {
       this.popoutService.addSuccessPopOut('Draft session deleted successfully')
     })
       .catch(() => {
         this.popoutService.addErrorPopOut('Something went wrong, please try again later')
       })
       .finally(() => {
         this.spinnerService.setIsLoading(false);
       });
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
