import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {addDoc, collection, doc, Firestore, getDoc, getDocs, query, where} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {environment} from '../../../environments/environment';

export interface DraftPlayer {
  id: string,
  name: string
}
interface TeamDraftSession {
  currentTurn: number;
  members: string[];
  status: 'active' | 'completed'; // or string if not enum
  teamCount: number;
  teams: Record<string, Player[]>;
  unassignedPlayers: DraftPlayer[];
  createdBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreateDraftSessionService {


  private playersService = inject(PlayersService);
  private firestore = inject(Firestore);
  private auth = inject(Auth);

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
    return {name: player.name, id: player.id}
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


  async createSession(captains: any[]): Promise<string> {

    const captainsIds = captains.map((captain) => captain.player.id)

    const selectedPlayers: { name: string; id: string }[] = Array.from(this.checkedPlayers)
        .map(id => this.allPlayers().find(player => player.id === id))
        .filter((player): player is { name: string; id: string } => !!player && !captainsIds.includes(player.id));

    console.log(selectedPlayers)
    const membersEmails = captains.map((captain: {captainEmail: string, player: Player}) => captain.captainEmail);

    const initialTeams: Record<string, Player[]> = {};

    for (let i = 0; i < this.numberOfTeams(); i++) {
      const captainGroup = captains.at(i);
      const captainPlayer: Player = captainGroup?.player;
      initialTeams[`team${i}`] = captainPlayer ? [captainPlayer] : [];
    }

    const sessionData: TeamDraftSession = {
      currentTurn: 0,
      members: membersEmails,
      status: 'active',
      teamCount: this.numberOfTeams(),
      teams: initialTeams,
      unassignedPlayers: selectedPlayers,
      createdBy: this.auth.currentUser?.email || ''
    };

    const sessionsRef = collection(this.firestore, `groups/${this.playersService.selectedGroup().id}/teamDraftSessions`);
    const docRef = await addDoc(sessionsRef, sessionData);
    return docRef.id; // sessionId
  }

  async getSessionsByCreator(): Promise<any[]> {
    const sessionsRef = collection(this.firestore, `groups/${this.playersService.selectedGroup().id}/teamDraftSessions`);
    const q = query(sessionsRef, where('createdBy', '==', this.auth.currentUser?.email));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    debugger;
    this.captainPlayerIds.set(usedIds);
  }


  togglePlayer(player: {id: string, name: string}, checkEvent: any) {
    console.log(checkEvent.checked)
    if (checkEvent.checked) {
      this.checkedPlayers.add(player.id);
    } else {
      this.checkedPlayers.delete(player.id);
    }
  }

}
