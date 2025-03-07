import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  addDoc,
  collectionData, getDoc, or, updateDoc, writeBatch
} from '@angular/fire/firestore';
import {Auth} from '@angular/fire/auth';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);

  constructor() {}

  getAllPlayers(groupId: string) {
    const playersCollection = collection(this.firestore, `groups/${groupId}/players`);
    return collectionData(playersCollection, { idField: "id" })
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

  /**
   * Add a player to a specific group.
   * Only the group creator can add players.
   * @param groupId ID of the group.
   * @param playerName Name of the player.
   * @returns Promise resolving to success/failure.
   */
  async addPlayerToGroup(groupId: string, playerName: string): Promise<boolean> {
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

    // Ensure only the group creator can add players
    const groupData = groupSnap.data();
    if (groupData?.['createdBy'] !== user.email) {
      console.error("Only the group admin can add players");
      return false;
    }

    // 🔍 Check if a player with the same name already exists
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const q = query(playersRef, where("name", "==", playerName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.error(`Player with name "${playerName}" already exists in group "${groupId}".`);
      return false;
    }

    // ✅ Add player if no duplicate is found
    const playerData = {
      name: playerName,
      stats: {
        goals: 0,
        games: 0,
        wins: 0
      }
    };

    await addDoc(playersRef, playerData);
    console.log(`Player "${playerName}" added to group "${groupId}"`);
    return true;
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

  //   const playersCollection = collection(this.firestore, 'players');
  //     return collectionData(playersCollection, { idField: "id" });
  // }
  // async getAllPlayers(groupId = 'rach') {
  //   const playersRef = collection(this.firestore, `groups/${groupId}/players`);
  //
  //   try {
  //     const querySnapshot = await getDocs(playersRef);
  //     const players = querySnapshot.docs.map(doc => ({
  //       id: doc.id, // Include document ID if needed
  //       ...doc.data()
  //     }));
  //
  //     console.log(`Players in group "${groupId}":`, players);
  //     return players;
  //   } catch (error) {
  //     console.error("Error fetching players:", error);
  //     return [];
  //   }
  // }

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

  async updatePlayerStats(groupId: string, playerName: string, updatedStats: any) {
    const user = this.auth.currentUser;
    if (!user) {
      return Promise.reject();
    }
    const playersRef = collection(this.firestore, `groups/${groupId}/players`);
    const q = query(playersRef, where("name", "==", playerName.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return Promise.reject();
    }
    const playerDocRef = doc(this.firestore, `groups/${groupId}/players/${querySnapshot.docs[0].id}`);
    return updateDoc(playerDocRef, updatedStats);
  }
}

