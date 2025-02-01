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
  collectionData
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class PlayersApiService {

  private firestore = inject(Firestore); // Using Firestore Injection

  constructor() {}

  async savePlayers(players: any[]) {
    const playersCollection = collection(this.firestore, 'players'); // Reference to 'players' collection

    for (const player of players) {
      try {
        // Normalize player's name to lowercase
        const normalizedPlayerName = player.name.toLowerCase();

        // Query Firestore for existing player by normalized name (case insensitive)
        const q = query(playersCollection, where('name', '==', normalizedPlayerName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Player exists, update the first matching document
          const playerDoc = doc(this.firestore, 'players', querySnapshot.docs[0].id);
          await setDoc(playerDoc, {...player, name: normalizedPlayerName}, { merge: true }); // Merge: Update existing fields, keep old ones
        } else {
          // Player does not exist, add new
          await addDoc(playersCollection, { ...player, name: normalizedPlayerName });
        }
      } catch (error) {
        console.error(`❌ Error processing player "${player.name}":`, error);
      }
    }
  }

  getAllPlayers() {
    const playersCollection = collection(this.firestore, 'players'); // Reference to 'players' collection
      return collectionData(playersCollection, { idField: "id" });  // Fetch all documents
  }

}
