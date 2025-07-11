import {inject, Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
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
import {Observable, switchMap} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  getAllActivePlayers(groupId: string): Observable<any[]> {
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const activePlayersQuery = query(playersRef, where('isActive', '!=', false));
    const players$ = collectionData(activePlayersQuery, { idField: 'id' });


    return players$.pipe(
      switchMap((players: any[]) => {
        const playersWithStats$ = players.map(async (player) => {
          const statsRef = collection(this.firestore, `groups/${groupId}/players/${player.id}/statistics`);
          const statsSnap = await getDocs(statsRef);
          const statistics: Record<string, any> = {};
          statsSnap.forEach(doc => statistics[doc.id] = doc.data());
          return { ...player, statistics };
        });
        return Promise.all(playersWithStats$);
      })
    )
  }

  getAllPlayers(groupId: string) {
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    return collectionData(playersRef, { idField: "id" });
  }

  /**
   * Create a new group with the authenticated user's email as admin.
   * @param groupName Name of the group.
   * @returns Promise with the created group ID.
   */
  async createGroup(groupName: string): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return null;
    }

    const groupRef = collection(this.firestore, 'groups');
    const groupData = {
      name: groupName,
      createdBy: user.email,
      members: [user.email], // readonly
      admins: [user.email], // for manage
      createdAt: new Date()
    };

    try {
      const docRef = await addDoc(groupRef, groupData);
      console.log("🎉 Group created with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("❌ Error creating group:", error);
      return null;
    }
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
    const batch = writeBatch(this.firestore);

    for (const player of players) {
      const { statistics, ...playerData } = player;
      const normalizedPlayerName = playerData.name.toLowerCase();
      const q = query(playersRef, where("name", "==", normalizedPlayerName));
      const querySnapshot = await getDocs(q);

      const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${querySnapshot.docs[0].id}`);
      batch.set(playerDocRef, { ...playerData, name: normalizedPlayerName }, { merge: true });
      // If there are statistics, write them to the subcollection
      if (statistics && typeof statistics === 'object') {
        for (const [date, statData] of Object.entries(statistics)) {
          const statRef = doc(this.firestore, `${playerDocRef.path}/statistics/${date}`);
          batch.set(statRef, statData as any, { merge: true });
        }
      }
    }

    await batch.commit();
    console.log("✅ All players and stats added/updated successfully!");

    return true;
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

  async updatePlayerStats(groupId: string, playerId: string, statistics: any) {
    const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${playerId}`);

    if (!statistics || typeof statistics !== 'object') {
      throw new Error('Invalid statistics object');
    }

    const batch = writeBatch(this.firestore);

    for (const [date, statData] of Object.entries(statistics)) {
      const statRef = doc(this.firestore, `${playerDocRef.path}/statistics/${date}`);
      batch.set(statRef, statData as any, { merge: true }); // merge to update fields without overwriting
    }

    return batch.commit();
  }

  async updatePlayerDetails(groupId: string, updatedPlayer: any) {
    const playerSnapshot = await this.getPlayerSnapshot(groupId, updatedPlayer.id);

    if (playerSnapshot.empty) {
      return Promise.reject();
    }
    const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${playerSnapshot.docs[0].id}`);
    return updateDoc(playerDocRef, {
      rating: updatedPlayer.rating,
      email: updatedPlayer.email || ''
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

  async submitRatings(ratingData: Record<string, number>, groupId: string) {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject();
    }

    const ratingDocRef = doc(this.firestore, `groups/${groupId}/ratings/${user.email}`);
    return await setDoc(ratingDocRef, ratingData, { merge: true });
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
}

