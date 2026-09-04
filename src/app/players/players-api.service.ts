import {inject, Injectable} from '@angular/core';
import {
  collection,
  collectionData,
  deleteField,
  doc,
  Firestore,
  getDoc,
  getDocs,
  or,
  query, setDoc,
  updateDoc,
  where,
  writeBatch
} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {Observable} from 'rxjs';
import {DuplicatePlayerError} from './errors/duplicate-player-error';
import {Player} from './models/player.model';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  getPlayers(groupId: string, activePlayers: boolean): Observable<any[]> {
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const activePlayersQuery = query(playersRef, where('isActive', '==', activePlayers));
    return collectionData(activePlayersQuery, {idField: 'id'}) as Observable<any[]>;
  }

  getAllPlayers(groupId: string) {
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const activePlayersQuery = query(playersRef, where('isActive', '==', true));
    return collectionData(activePlayersQuery, { idField: "id" });
  }

  async savePlayers(groupId: string, players: any[]): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return false;
    }

    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
      console.error("Group not found");
      return false;
    }

    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const allPlayersSnap = await getDocs(playersRef);
    const playerNameToDocId = new Map<string, string>(
      allPlayersSnap.docs.map(playerDoc => [(playerDoc.data() as any).name as string, playerDoc.id])
    );

    const batch = writeBatch(this.firestore);
    for (const player of players) {
      const { statistics, ...playerData } = player;
      const normalizedPlayerName = playerData.name.toLowerCase();
      const playerDocId = playerNameToDocId.get(normalizedPlayerName);
      if (!playerDocId) continue;
      const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${playerDocId}`);
      batch.set(playerDocRef, { ...playerData, name: normalizedPlayerName }, { merge: true });
    }

    await batch.commit();
    console.log("✅ All players and stats added/updated successfully!");

    return true;
  }

  /**
   * Sets (or clears, when alias is empty) the display nickname for one team slot
   * on the group document. The slot key itself is untouched - it stays the team's id.
   */
  async updateTeamAlias(groupId: string, teamKey: string, alias: string) {
    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    return updateDoc(groupDocRef, { [`teamAliases.${teamKey}`]: alias || deleteField() });
  }

  getUserCreatedGroups(): Observable<any[]> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return new Observable(); // Return empty observable if no user
    }

    const groupsCollection = collection(this.firestore, 'groups');
    const q = query(groupsCollection, or( where("createdBy", "==", user.email), where("admins", "array-contains", user.email), where("members", "array-contains", user.email) ))
    return collectionData(q, { idField: "id" });
  }

  async updatePlayerDetails(groupId: string, updatedPlayer: Player, player: Player) {
    const playerSnapshot = await this.getPlayerSnapshot(groupId, updatedPlayer.id);

    if (playerSnapshot.empty) {
      return Promise.reject();
    }

    if(player.name !== updatedPlayer.name) {
      const playersRef = collection(this.firestore, `groups/${groupId}/players`);
      const q = query(playersRef, where("name", "==", updatedPlayer.name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new DuplicatePlayerError(updatedPlayer.name);
      }
    }

    const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${playerSnapshot.docs[0].id}`);
    return updateDoc(playerDocRef, {
      name: updatedPlayer.name,
      rating: updatedPlayer.rating,
      email: updatedPlayer.email || '',
      isGuest: updatedPlayer.isGuest
    });
  }

  private async getPlayerSnapshot(groupId: string, playerId: string) {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject();
    }
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const q = query(playersRef, where("id", "==", playerId));
    return await getDocs(q);
  }

  async submitRatings(ratingData: Record<string, { name: string; rating: number}>, groupId: string) {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject();
    }

    const ratingDocRef = doc(this.firestore, `groups/${groupId}/ratings/${user.email}`);
    return await setDoc(ratingDocRef, ratingData);
  }

  async setPlayerActiveStatus(groupId: string, playerId: string, isActive: boolean) {
    const playerSnapshot = await this.getPlayerSnapshot(groupId, playerId);
    const playerRef = doc(this.firestore, `groups/${groupId}/players/${playerSnapshot.docs[0].id}`);
    return updateDoc(playerRef, {isActive});
  }

  async getDraftSessionsByCreator(groupId: string): Promise<any[]> {
    const sessionsRef = collection(this.firestore, `groups/${groupId}/teamDraftSessions`);
    const q = query(sessionsRef, where('createdBy', '==', this.auth.currentUser?.email));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Dead code — stats are computed from match events; the statistics subcollection is no longer written.
  // async deleteDayStatistics(groupId: string, dateToDelete: string) {
  //   const playersRef = collection(this.firestore, `groups/${groupId}/players`);
  //   const playersSnap = await getDocs(playersRef);
  //   const batch = writeBatch(this.firestore);
  //   for (const playerDoc of playersSnap.docs) {
  //     const playerId = playerDoc.id;
  //     const statRef = doc(this.firestore, `groups/${groupId}/players/${playerId}/statistics/${dateToDelete}`);
  //     batch.delete(statRef);
  //   }
  //   await batch.commit();
  // }

  async removeDraftSession(groupId: string, sessionId: string) {
    const sessionRef = doc(this.firestore, `groups/${groupId}/teamDraftSessions/${sessionId}`);
    const messagesCollectionRef = collection(this.firestore, `groups/${groupId}/teamDraftSessions/${sessionId}/messages`);

    const messagesSnapshot = await getDocs(messagesCollectionRef);
    const batch = writeBatch(this.firestore);
    messagesSnapshot.docs.forEach(msgDoc => batch.delete(msgDoc.ref));
    batch.delete(sessionRef);
    await batch.commit();
  }

  async setFantasyMetaIsActive(groupId: string, isActive: boolean) {
    const metaRef = doc(this.firestore, `groups/${groupId}/fantasyDrafts/meta`);
    await updateDoc(metaRef, { isActive });
  }


  async deleteAllStatsAndSpecialCollections(groupId: string) {
    const batch = writeBatch(this.firestore);

    // --- 1. Delete all player statistics ---
    const playersCol = collection(this.firestore, `groups/${groupId}/players`);
    const playersSnap = await getDocs(playersCol);

    const statsSnaps = await Promise.all(
      playersSnap.docs.map(playerDoc =>
        getDocs(collection(this.firestore, `groups/${groupId}/players/${playerDoc.id}/statistics`))
      )
    );
    statsSnaps.forEach(statsSnap => statsSnap.forEach(statDoc => batch.delete(statDoc.ref)));

    // // --- 2. Delete all Team Of The Week ---
    const totwCol = collection(this.firestore, `groups/${groupId}/teamOfTheWeek`);
    const totwSnap = await getDocs(totwCol);
    totwSnap.forEach(totwDoc => batch.delete(totwDoc.ref));

    // // --- 3. Delete all Fantasy Drafts ---
    const fantasyCol = collection(this.firestore, `groups/${groupId}/fantasyDrafts`);
    const fantasySnap = await getDocs(fantasyCol);
    fantasySnap.forEach(fantasyDoc => batch.delete(fantasyDoc.ref));

    // --- Commit ---
    await batch.commit();
  }
}

