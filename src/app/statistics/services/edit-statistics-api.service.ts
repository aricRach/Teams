import {inject, Injectable} from '@angular/core';
import {doc, Firestore, writeBatch} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class EditStatisticsApiService {

  private firestore = inject(Firestore);

  async updateStatisticsForPlayers(
    groupId: string,
    updates: { id: string; date: string; stats: Record<string, any> }[]
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const { id: playerId, date, stats } of updates) {
      const statDocRef = doc(
        this.firestore,
        `groups/${groupId}/players/${playerId}/statistics/${date}`
      );
      batch.set(statDocRef, stats, { merge: false });
    }
    await batch.commit();
  }
}
