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
import {Observable} from 'rxjs';
import {Player} from './models/player.model';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  constructor() {}

  getAllActivePlayers(groupId: string) {
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const activePlayersQuery = query(playersRef, where('isActive', '!=', false));

    return collectionData(activePlayersQuery, { idField: "id" }); // Fetch only active players with Firestore ID
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

  async addOrUpdatePlayers(groupId: string, players: any[]): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return false;
    }

    // Check if group exists
    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
      console.error("Group not found");
      return false;
    }

    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const batch = writeBatch(this.firestore);

    for (const player of players) {
      const normalizedPlayerName = player.name.toLowerCase();
      const q = query(playersRef, where("name", "==", normalizedPlayerName));
      const querySnapshot = await getDocs(q);

      let playerDocRef;

      if (!querySnapshot.empty) {
        // If player exists, get their document reference
        playerDocRef = doc(this.firestore, `groups/${groupId}/players/${querySnapshot.docs[0].id}`);
        console.log(`Updating player "${player.name}" in group "${groupId}".`);
      } else {
        // If player doesn't exist, create a new document reference
        playerDocRef = doc(playersRef); // Auto-generated ID
        console.log(`Adding new player "${player.name}" to group "${groupId}".`);
      }

      batch.set(playerDocRef, { ...player, name: normalizedPlayerName }, { merge: true });
    }

    await batch.commit();
    console.log("✅ All players added/updated successfully!");

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

  async updatePlayerStats(groupId: string, playerName: string, updatedPlayer: any, updateStats: boolean) {
    const playerSnapshot = await this.getPlayerSnapshot(groupId, playerName);

    if (playerSnapshot.empty) {
      return Promise.reject();
    }
    const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${playerSnapshot.docs[0].id}`);
    if(updateStats) {
     return updateDoc(playerDocRef, updatedPlayer);
    }
    return updateDoc(playerDocRef, {
      rating: updatedPlayer.rating,
      email: updatedPlayer.email
    });
  }

  private async getPlayerSnapshot(groupId: string, playerName: string) {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject();
    }
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const q = query(playersRef, where("name", "==", playerName.toLowerCase()));
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

  async setPlayerActiveStatus(groupId: string, playerName: string, isActive: boolean) {
    const playerSnapshot = await this.getPlayerSnapshot(groupId, playerName);
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

