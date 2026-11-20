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
import {collapseExtraTeams} from '../utils/collapse-extra-teams.util';

export const LAST_GROUP_ID_KEY = 'lastGroupId';

type TeamsMap = {[key: string]: { players: Player[] }};

/** The team key of every player, so saved teams can be restored later. */
function teamOfPlayer(teams: TeamsMap): Record<string, string> {
  const teamOf: Record<string, string> = {};
  for (const [key, team] of Object.entries(teams)) {
    for (const player of team?.players ?? []) teamOf[player.id] = key;
  }
  return teamOf;
}

/** The team key of every player at the last save. */
type SavedTeams = Record<string, string>;

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
  /** False for a signed-in viewer who opened a shared /home/<groupId> link without being a member. */
  isMember = signal(false);
  private teams = signal<{[key: string]: { players: Player[] }}>(structuredClone(skeleton));
  private inActivePlayers = signal<null | Player[]>(null);
  allPlayersLabel = 'allPlayers';

  readonly isLoadingPlayers = signal(false);

  // The starting point for the Team Builder's "Unsaved changes": the teams as last loaded, saved,
  // or as they were when the Team Builder opened (see startTrackingTeamChanges).
  private readonly savedTeams = signal<SavedTeams | null>(null);

  /**
   * Called when the Team Builder opens: only changes made there count as unsaved.
   * Game-page moves aren't saved until a game ends, so without this they'd show as unsaved too.
   */
  startTrackingTeamChanges(): void {
    // Not loaded yet: loading sets the starting point itself.
    if (this.savedTeams() === null) return;
    this.savedTeams.set(teamOfPlayer(this.teams()));
  }
  // Only moves count: adding, reactivating or removing a player is saved right away.
  // A player who wasn't there at the last save counts as on the bench.
  // Compares the teams as shown, so lowering the team count (hidden teams go to the bench) is a change too.
  readonly hasUnsavedTeams = computed(() => {
    const saved = this.savedTeams();
    if (!saved) return false;
    const shownTeams = collapseExtraTeams(this.teams(), this.numberOfTeams());
    return Object.entries(shownTeams).some(([key, team]) =>
      team.players.some(player => (saved[player.id] ?? this.allPlayersLabel) !== key));
  });

  /** Puts every player back in the team they were in when the Team Builder opened (or at the last save). Player details (name, rating...) are kept. */
  discardUnsavedTeams(): void {
    const saved = this.savedTeams();
    if (!saved) return;
    const current = this.teams();
    const restored: TeamsMap = {};
    for (const key of Object.keys(current)) restored[key] = { players: [] };
    for (const [key, team] of Object.entries(current)) {
      for (const player of team.players) {
        const savedKey = saved[player.id];
        restored[savedKey && restored[savedKey] ? savedKey : key].players.push(player);
      }
    }
    this.teams.set(restored);
    // Show every team that has players again, in case the team count was lowered.
    this.numberOfTeams.set(Math.max(this.numberOfTeams(), this.countUsedTeams(restored)));
  }

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

  readonly savePlayers = createMutation<[specificTeams?: any, silent?: boolean], SavedTeams>({
    run: async (specificTeams?: any) => {
      // Taken before saving, so a change made while the save runs still counts as unsaved.
      const savedTeams = teamOfPlayer(specificTeams || this.teams());
      const saved = await this.playersApiService.savePlayers(this.selectedGroup().id, this.flattenPlayers(true, true, specificTeams));
      if (!saved) throw new Error('Teams were not saved');
      return savedTeams;
    },
    onSuccess: (savedTeams, _specificTeams, silent) => {
      this.savedTeams.set(savedTeams);
      if (!silent) this.popoutService.addSuccessPopOut('Data was saved successfully.');
    },
    onError: () => this.popoutService.addErrorPopOut('Could not save the teams, please try again.'),
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
            this.savedTeams.set(teamOfPlayer(teams));
            this.numberOfTeams.set(this.countUsedTeams(teams));
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

  /** URL inside the selected group, e.g. groupUrl('statistics') -> '/home/<groupId>/statistics'. */
  groupUrl(...segments: string[]): string {
    return ['/home', this.selectedGroup()?.id, ...segments].join('/');
  }

  selectGroup(selectedGroup: {admins: string[]; members?: string[]; id: string, createdBy?: string, teamAliases?: Record<string, string>, teamColors?: Record<string, string>}, email: string) {
    // The inactive players are cached per group; a new group must fetch its own.
    if (this.selectedGroup()?.id !== selectedGroup.id) this.inActivePlayers.set(null);
    this.selectedGroup.set(selectedGroup);
    this.isAdmin.set(selectedGroup.admins.includes(email));
    this.isGroupOwner.set(selectedGroup.createdBy === email)
    this.isMember.set(
      selectedGroup.admins.includes(email) ||
      (selectedGroup.members ?? []).includes(email) ||
      selectedGroup.createdBy === email
    );
    try {
      localStorage.setItem(LAST_GROUP_ID_KEY, selectedGroup.id);
    } catch {}
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

  /** Teams up to the last one that has players (at least 2), so a shared link shows the teams as they are. */
  private countUsedTeams(teams: {[key: string]: { players: Player[] }}): number {
    const teamKeys = Object.keys(teams).filter(key => key !== this.allPlayersLabel);
    let lastUsed = 0;
    teamKeys.forEach((key, index) => {
      if (teams[key].players.length > 0) {
        lastUsed = index + 1;
      }
    });
    return Math.max(2, lastUsed);
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
