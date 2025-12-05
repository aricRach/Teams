import {inject, Injectable} from '@angular/core';
import {collection, collectionData, doc, Firestore, writeBatch} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class CommunityRatingsApiService {
  private firestore = inject(Firestore);

  getAverageRatings(groupId: string) {
    const ratingsColRef = collection(this.firestore, `groups/${groupId}/ratings`);
    return collectionData(ratingsColRef);
  }


  async setCommunityRatings(groupId: string, ratingsObj: any): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const playerId of Object.keys(ratingsObj)) {
      const player = ratingsObj[playerId];
      const playerRef = doc(this.firestore, `groups/${groupId}/players/${playerId}`);
      batch.update(playerRef, {
        rating: player.rating,
        updatedAt: new Date()
      });
    }
    await batch.commit();
  }
}
