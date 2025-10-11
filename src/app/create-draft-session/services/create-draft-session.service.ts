import {computed, inject, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {addDoc, collection, Firestore} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {environment} from '../../../environments/environment';
import {skeleton} from '../../players/consts/teams-skeleton';
import {Router} from '@angular/router';
import {PopupsService} from 'ui';
import {NavigationService} from '../../shared/navigation/navigation.service';

export interface DraftPlayer {
  id: string,
  name: string
}
export interface TeamDraftSession {
  currentTurn: number;
  members: string[];
  status: 'active' | 'completed'; // or string if not enum
  teamCount: number;
  teams: Record<string, Player[]>;
  unassignedPlayers: DraftPlayer[];
  createdBy: string;
  id: string;
  selectionMethod: {
    isSnakeMode: boolean;
    isForward: boolean;
  }
  messages?: any
}

export class CreateDraftSessionService {

  playersService = inject(PlayersService);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  router = inject(Router);
  private popoutService = inject(PopupsService);
  navigationService = inject(NavigationService);
  checkedPlayers: Set<string> = new Set();

  chunkedPlayers = computed(() => {
    const players =  this.playersService.flattenPlayers().map((player) => {
      return {name: player.name, id: player.id} as any
    });
    const chunkSize = 5;
    const result: {name: string, id: string}[][] = [];
    for (let i = 0; i < players.length; i += chunkSize) {
      result.push(players.slice(i, i + chunkSize));
    }
    return result as {name: string, id: string}[][];
  });

  allPlayers = computed(() => this.playersService.flattenPlayers().map((player) => {
    return {name: player.name, id: player.id, email: player.email || ''}
  }))

  numberOfTeams = signal(this.playersService.numberOfTeams());

  readonly captainOptions = computed(() => {
    const allPlayers = this.allPlayers();
    const selectedIds = this.captainPlayerIds();
    const numberOfTeams = this.numberOfTeams();

    return Array.from({ length: numberOfTeams }, (_, index) => {
      const currentId = selectedIds?.[index];

      return allPlayers.filter(player => {
          return player.id === currentId || !selectedIds.includes(<string>player.id)
      }
      );
    });
  });

  readonly captainPlayerIds = signal<string[]>([]);


  async createSession(captains: any[], isSnakeMode: boolean): Promise<string> {

    const captainsIds = captains.map((captain) => captain.player.id)

    const selectedPlayers: { name: string; id: string }[] = Array.from(this.checkedPlayers)
        .map(id => this.allPlayers().find(player => player.id === id))
        .filter((player): player is { name: string; id: string, email: string } => !!player && !captainsIds.includes(player.id));

    const membersEmails = captains.map((captain: {captainEmail: string, player: Player}) => captain.captainEmail);

    const initialTeams: Record<string, Player[]> = {};

    for (let i = 0; i < this.numberOfTeams(); i++) {
      const captainGroup = captains.at(i);
      const captainPlayer: Player = captainGroup?.player;
      initialTeams[`team${i}`] = captainPlayer ? [captainPlayer] : [];
    }

    const sessionData = {
      currentTurn: 0,
      members: membersEmails,
      status: 'active',
      teamCount: this.numberOfTeams(),
      teams: initialTeams,
      unassignedPlayers: selectedPlayers,
      createdBy: this.auth.currentUser?.email || '',
      selectionMethod: {
        isSnakeMode,
        isForward: isSnakeMode ? true : null
      }
    };

    const sessionsRef = collection(this.firestore, `groups/${this.playersService.selectedGroup().id}/teamDraftSessions`);
    const docRef = await addDoc(sessionsRef, sessionData);
    return docRef.id; // sessionId
  }

  buildUrl(sessionId: string) {
    const domain = environment.domain;
    return `${domain}/#/team-draft/${this.playersService.selectedGroup().id}/${sessionId}`;
  }

  updateCaptainsOptions(captainsControlArray: { captainEmail: string; player: Player }[]) {
    const usedIds = captainsControlArray
        .map(captain => {
          if(!captain?.player?.id) {
          return
          }
          this.checkedPlayers.add(captain.player.id);
          return captain.player?.id
        })
        .filter((id): id is string => !!id);
    this.captainPlayerIds.set(usedIds);
  }


  togglePlayer(player: {id: string, name: string}, checkEvent: any) {
    if (checkEvent.checked) {
      this.checkedPlayers.add(player.id);
    } else {
      this.checkedPlayers.delete(player.id);
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.playersService.removeDraftSession(sessionId);
    this.navigationService.unlockNavigation();
    this.router.navigate(['/home']);
  }

  async finishTeamDraftSession(sessionData: any) {
    this.setTeamsAfterDraft(sessionData.teamCount, sessionData.teams);
    await this.removeSession(sessionData.id);
    this.popoutService.addSuccessPopOut('New teams were set successfully');
    this.navigationService.unlockNavigation();
    this.router.navigate(['home', 'game']);
  }

  setTeamsAfterDraft(teamCount: number, draftTeams: { [key: string]: { id: string, name: string }[] }): void {
    const newTeams = Object.fromEntries(Object.entries(structuredClone(skeleton)).slice(0, teamCount + 1));

    // Step 1: Collect all players into allPlayers
    const teams = this.playersService.getTeams();
    Object.keys(teams).forEach(team => {
      if (teams[team]?.players && Array.isArray(teams[team].players)) {
        newTeams['allPlayers'].players.push(...teams[team].players);
      }
    });

    // Step 2: Create a map for fast lookup and removal
    const playerMap = new Map<string, any>();
    newTeams['allPlayers'].players.forEach(player => {
      // @ts-ignore
      playerMap.set(player.id, player);
    });

    // Step 3: Assign drafted players to their corresponding teams
    for (const draftTeamKey in draftTeams) {
      const teamIndex = parseInt(draftTeamKey.replace("team", ""));
      const skeletonKey = `team${String.fromCharCode(65 + teamIndex)}`; // 0 → A, 1 → B, etc.

      const draftedPlayers = draftTeams[draftTeamKey];
      for (const draftedPlayer of draftedPlayers) {
        const player = playerMap.get(draftedPlayer.id);
        if (player) {
          // @ts-ignore
          newTeams[skeletonKey].players.push(player);
          playerMap.delete(draftedPlayer.id);
        }
      }
    }

    // Step 4: Update remaining players in allPlayers
    // Step 4: Update remaining players in allPlayers
    newTeams['allPlayers'].players = Array.from(playerMap.values());

    // Step 5: Save or emit the updated teams
    this.playersService.setTeams(newTeams);
    this.playersService.savePlayers().then();
  }

  lockNavigation() {
    this.navigationService.lockNavigation();
  }
}
