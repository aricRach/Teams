import {inject, Injectable} from '@angular/core';
import {collection, doc, Firestore, getDoc, getDocs, writeBatch} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {Player, TeamsOptions} from '../../players/models/player.model';
import {DuplicatePlayerError} from '../../players/errors/duplicate-player-error';
import {NewPlayer} from './register-players.service';

@Injectable({
  providedIn: 'root'
})
export class RegisterPlayersApiService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async addPlayersToGroup(groupId: string, players: NewPlayer[]): Promise<Player[]> {
    // 1. Ensure user authenticated
    if (!this.auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // 2. Ensure group exists
    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
      throw new Error('Group not found');
    }

    // 3. Fetch all existing player names
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const existingSnap = await getDocs(playersRef);
    const existingNames = new Set(
      existingSnap.docs.map(d => (d.data()['name'] as string).trim().toLowerCase())
    );

    // 4. Check for duplicates
    const newNames = new Set<string>();
    for (const p of players) {
      const nameKey = p.name.trim().toLowerCase();

      if (existingNames.has(nameKey)) {
        throw new DuplicatePlayerError(p.name);
      }

      if (newNames.has(nameKey)) {
        throw new DuplicatePlayerError(p.name);
      }
      newNames.add(nameKey);
    }

    // 5. Write all players in a batch
    const batch = writeBatch(this.firestore);
    const addedPlayers: Player[] = [];

    for (const p of players) {
      const newDocRef = doc(playersRef); // auto-ID
      const playerWithId = { ...p, id: newDocRef.id, team: TeamsOptions.AllPlayers};
      batch.set(newDocRef, playerWithId);
      // @ts-ignore
      addedPlayers.push(playerWithId);
    }

    await batch.commit();
    return addedPlayers;
  }
}
