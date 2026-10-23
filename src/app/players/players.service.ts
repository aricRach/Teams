import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersApiService} from './players-api.service';
import {Player} from './models/player.model';
import {finalize, of, take, tap} from 'rxjs';
import {SpinnerService} from '../spinner.service';
import {PopupsService} from 'ui';
import {skeleton} from './consts/teams-skeleton';
import {MembersService} from '../admin/services/members.service';
import {DuplicatePlayerError} from './errors/duplicate-player-error';
import {TEAM_ALIAS_MAX_LENGTH} from '../utils/team-label.util';
import {createMutation, runOptimistic} from '../shared/optimistic/run-optimistic';

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
  teamAliases = signal<Record<string, string>>({});
  teamColors = signal<Record<string, string>>({});
  userGroups = signal<null | any[]>(null);
  isAdmin = signal(false);
  isGroupOwner = signal(false);
  private teams = signal<{[key: string]: { players: Player[] }}>(structuredClone(skeleton));
  private inActivePlayers = signal<null | Player[]>(null);
  allPlayersLabel = 'allPlayers';

  readonly isLoadingPlayers = signal(false);

   computedTeams = computed(() =>  JSON.parse(JSON.stringify(this.teams()))) // use only in drag-drop-component.

  selectedTeamsKeys = computed(() => Object.keys(this.teams()))
  setTeams(teams: any) {
    this.teams.set({...teams});
  }

  setInactivePlayers(inactivePlayers: Player[]): void {
     this.inActivePlayers.set(inactivePlayers);
  }

  getInactivePlayers(): Player[] | null {
     return this.inActivePlayers();
  }

  getUserCreatedGroups() {
    if(this.userGroups()) {
      return of(this.userGroups());
    }
    return this.playersApiService.getUserCreatedGroups().pipe(take(1), tap((groups) => {
      this.userGroups.set(groups);
    }));
  }

  loadGroupPlayers(): void {
    this.isLoadingPlayers.set(true);
    this.spinnerService.setIsLoading(true);
    this.getPlayersFromDB().pipe(finalize(() => {
      this.isLoadingPlayers.set(false);
      this.spinnerService.setIsLoading(false);
    })).subscribe({
      error: () => this.popoutService.addErrorPopOut('Could not load the players, please refresh the page.'),
    });
  }

  getSpecificGroupPlayers(groupId: string) {
     this.spinnerService.setIsLoading(true);
     return this.playersApiService.getAllPlayers(groupId)
       .pipe(finalize(() => this.spinnerService.setIsLoading(false)));
  }

  readonly savePlayers = createMutation<[specificTeams?: any, silent?: boolean], unknown>({
    run: (specificTeams?: any) =>
      this.playersApiService.savePlayers(this.selectedGroup().id, this.flattenPlayers(true, true, specificTeams)),
    onSuccess: (_, _specificTeams, silent) => { if (!silent) this.popoutService.addSuccessPopOut('Data was saved successfully.'); },
    onError: () => this.popoutService.addErrorPopOut('Cant save try to save locally meantime.'),
  });

  flattenPlayers(showOnlyActive = true, includeGuests = true, specificTeams?: any): Player[] {
    const playersArray: Player[] = [];
    const teams = {...specificTeams || this.teams()}
    Object.keys(teams).forEach(team => {
      if (teams[team].players && Array.isArray(teams[team].players)) {
        teams[team].players
          .filter((p: Player) => {
            if(showOnlyActive && !includeGuests) {
              return p.isActive && !p.isGuest;
            }
            if(showOnlyActive) {
              return p.isActive;
            }
            return true;
          })
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

    getPlayersFromDB(activePlayers = true) {
      return this.playersApiService.getPlayers(this.selectedGroup().id, activePlayers).pipe(
         take(1),
        tap((allPlayers) => {
          if (activePlayers) {
            // Always hydrate every team slot from the DB. How many teams the game
            // screen *shows* is a separate, game-flow-only concern (numberOfTeams).
            const teams: {[key: string]: { players: Player[] }} = structuredClone(skeleton);
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
          }
        })
       )
    }

  readonly updatePlayerDetails = createMutation({
    run: async (player: Player, editedPlayer: Player) => {
      await this.playersApiService.updatePlayerDetails(this.selectedGroup().id, editedPlayer, player);
      this.updatePlayerSignal(editedPlayer);

      if(player.email && editedPlayer.email && player.email !== editedPlayer.email) {
        await this.membersService.replaceEmail(this.selectedGroup().id, player.email, editedPlayer.email);
      } else if(!player.email && editedPlayer.email) {
        await this.membersService.addMember(this.selectedGroup().id, editedPlayer.email);
      } else if(!editedPlayer.email && player.email) {
        await this.membersService.removeMember(this.selectedGroup().id, player.email)
      }
    },
    onSuccess: (_, _player, editedPlayer) => this.popoutService.addSuccessPopOut(`${editedPlayer.name} updated successfully.`),
    onError: (error, player) => this.popoutService.addErrorPopOut(error instanceof DuplicatePlayerError
      ? error.message
      : `Failed to update ${player.name}. Please try again later.`),
  });

  readonly submitRatings = createMutation({
    run: (groupId: string, ratingData: Record<string, { name: string; rating: number}>) =>
      this.playersApiService.submitRatings(ratingData, groupId),
    onSuccess: () => this.popoutService.addSuccessPopOut(`rating were successfully updated.`),
    onError: () => this.popoutService.addErrorPopOut(`cant save please try later`),
  });

  /** Not optimistic: two writes (player, then member email), and a rollback after only the second fails would be wrong. */
  readonly setPlayerActiveStatus = createMutation({
    run: async (player: Player, isActive: boolean) => {
      await this.playersApiService.setPlayerActiveStatus(this.selectedGroup().id, player.id, isActive);
      if(isActive) {
        await this.switchPlayerToActive(player);
      } else {
        await this.switchPlayerToInactive(player);
      }
    },
    onSuccess: (_, player, isActive) => this.popoutService.addSuccessPopOut(`${player.name} moved to ${isActive ? 'active' : 'inactive'}`),
    onError: () => this.popoutService.addErrorPopOut(`please try again later`),
  });

  getTeams(): any {
   return structuredClone(this.teams())
  }

  async getDraftSessionsByCreator(): Promise<any[]> {
   this.spinnerService.setIsLoading(true);
   return this.playersApiService.getDraftSessionsByCreator(this.selectedGroup().id).finally(() => {
     this.spinnerService.setIsLoading(false)
   })
  }

  readonly removeDraftSession = createMutation({
    run: (sessionId: string) => this.playersApiService.removeDraftSession(this.selectedGroup().id, sessionId),
    onSuccess: () => this.popoutService.addSuccessPopOut('Draft session deleted successfully'),
    onError: () => this.popoutService.addErrorPopOut('Something went wrong, please try again later'),
  });

  async setFantasyMetaIsActive(isActive: boolean) {
    return this.playersApiService.setFantasyMetaIsActive(this.selectedGroup().id, isActive);
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

    private removePlayerSignal(player: Player) {
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

  addPlayersSignal(addedPlayers: Player[], team='allPlayers') {
    this.teams.update((teams) => {
      teams[team].players.push(...addedPlayers);
      return teams;
    })
  }

  selectGroup(selectedGroup: {admins: string[]; id: string, createdBy?: string, teamAliases?: Record<string, string>, teamColors?: Record<string, string>}, email: string) {
    this.selectedGroup.set(selectedGroup);
    this.isAdmin.set(selectedGroup.admins.includes(email));
    this.isGroupOwner.set(selectedGroup.createdBy === email)
    this.teamAliases.set(selectedGroup.teamAliases ?? {});
    this.teamColors.set(selectedGroup.teamColors ?? {});
  }

  async setTeamAlias(teamKey: string, alias: string): Promise<void> {
    const groupId = this.selectedGroup()?.id;
    if (!groupId) return;
    const trimmedAlias = alias.trim().slice(0, TEAM_ALIAS_MAX_LENGTH);
    const previousAliases = this.teamAliases();
    const previousGroup = this.selectedGroup();
    await runOptimistic({
      apply: () => this.applyTeamAlias(teamKey, trimmedAlias),
      rollback: () => {
        this.teamAliases.set(previousAliases);
        this.selectedGroup.set(previousGroup);
      },
      commit: () => this.playersApiService.updateTeamAlias(groupId, teamKey, trimmedAlias),
      onError: () => this.popoutService.addErrorPopOut('Could not update team name, so it was changed back.'),
    });
  }

  private applyTeamAlias(teamKey: string, alias: string): void {
    this.teamAliases.update((aliases) => {
      const next = {...aliases};
      if (alias) {
        next[teamKey] = alias;
      } else {
        delete next[teamKey];
      }
      return next;
    });
    this.selectedGroup.update((group: any) => ({...group, teamAliases: {...this.teamAliases()}}));
  }

  async setTeamColor(teamKey: string, color: string): Promise<void> {
    const groupId = this.selectedGroup()?.id;
    if (!groupId) return;
    if (color) {
      const takenBy = Object.entries(this.teamColors()).find(([key, value]) => value === color && key !== teamKey);
      if (takenBy) {
        this.popoutService.addErrorPopOut('That color is already used by another team.');
        return;
      }
    }
    const previousColors = this.teamColors();
    const previousGroup = this.selectedGroup();
    await runOptimistic({
      apply: () => this.applyTeamColor(teamKey, color),
      rollback: () => {
        this.teamColors.set(previousColors);
        this.selectedGroup.set(previousGroup);
      },
      commit: () => this.playersApiService.updateTeamColor(groupId, teamKey, color),
      onError: () => this.popoutService.addErrorPopOut('Could not update team color, so it was changed back.'),
    });
  }

  private applyTeamColor(teamKey: string, color: string): void {
    this.teamColors.update((colors) => {
      const next = {...colors};
      if (color) {
        next[teamKey] = color;
      } else {
        delete next[teamKey];
      }
      return next;
    });
    this.selectedGroup.update((group: any) => ({...group, teamColors: {...this.teamColors()}}));
  }

  setNumberOfTeams(numberOfTeams: number) {
    this.numberOfTeams.set(numberOfTeams);
  }

  private async switchPlayerToActive(player: Player) {
    await this.membersService.addMember(this.selectedGroup().id, player.email);
    this.addPlayersSignal([{...player, isActive: true}]);
    const inactivePlayers = this.inActivePlayers()
    if (inactivePlayers) {
      // @ts-ignore
      this.inActivePlayers.update((inactivePlayers: Player[]) => {
        return inactivePlayers.filter(p => p.id !== player.id);
      })
    }
  }

  private async switchPlayerToInactive(player: Player) {
    await this.membersService.removeMember(this.selectedGroup().id, player.email);
    this.removePlayerSignal(player);
    // @ts-ignore
    this.inActivePlayers.update((inactivePlayers: Player[]) => {
      inactivePlayers.push(player);
      return inactivePlayers;
    })
  }

  deleteAllStatsAndSpecialCollections() {
     this.playersApiService.deleteAllStatsAndSpecialCollections(this.selectedGroup().id).then(() => {
       this.popoutService.addSuccessPopOut('All statistics, Fantasy, Team Of The Week data deleted');
     })
  }
}
