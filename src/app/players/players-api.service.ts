import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, getDocs, query, setDoc, where, addDoc } from '@angular/fire/firestore';

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
        // Query Firestore for existing player by name
        const q = query(playersCollection, where('name', '==', player.name));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) { // Player exists, update the first matching document
          const playerDoc = doc(this.firestore, 'players', querySnapshot.docs[0].id);
          await setDoc(playerDoc, player, { merge: true }); // Merge: Update existing fields, keep old ones
        } else { // Player does not exist, add new
          await addDoc(playersCollection, player);
        }
      } catch (error) {
        console.error(`❌ Error processing player "${player.name}":`, error);
      }
    }
  }
}
