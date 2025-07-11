import {inject, Injectable} from '@angular/core';
import {Player} from '../../players/models/player.model';
import {collection, doc, Firestore, getDoc, getDocs, query, setDoc, where} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {DuplicatePlayerError} from '../../players/errors/duplicate-player-error';

@Injectable({
  providedIn: 'root'
})
export class AddNewPlayerApiService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async addPlayerToGroup(groupId: string, player: Player): Promise<Player> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
      throw new Error("Group not found");
    }

    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const q = query(playersRef, where("name", "==", player.name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new DuplicatePlayerError(player.name);
    }

    const newDocRef = doc(playersRef);
    const playerWithId = { ...player, id: newDocRef.id };
    await setDoc(newDocRef, playerWithId);
    return playerWithId;
  }
}
