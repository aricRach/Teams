import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDocs, query, setDoc, where, addDoc } from '@angular/fire/firestore';

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

  async getAllPlayers() {
    const playersCollection = collection(this.firestore, 'players'); // Reference to 'players' collection

    try {
      const querySnapshot = await getDocs(playersCollection);  // Fetch all documents
      const players = [] as any;

      querySnapshot.forEach((doc) => {
        // Log the document data to see what is being fetched
        const docData = doc.data();
        if (doc.exists()) {
          // If data exists, push the document's data along with the document ID
          players.push({ id: doc.id, ...docData });
        } else {
          console.log(`Document with ID  has no data.`);
        }
      });
      return players;
    } catch (error) {
      console.error("Error getting documents:", error);
    }
  }

}
