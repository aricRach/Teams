import { inject, Injectable } from '@angular/core';
import { collection, Firestore, getDocs, query, serverTimestamp, where, writeBatch, doc } from '@angular/fire/firestore';
import { MatchEventRecord, MatchRecord } from '../match-event-manager/models/match-event.model';

@Injectable({
  providedIn: 'root'
})
export class LiveMatchResumeApiService {
  private firestore = inject(Firestore);

  async getLiveMatches(groupId: string): Promise<MatchRecord[]> {
    const matchesRef = collection(this.firestore, `groups/${groupId}/matches`);
    const snapshot = await getDocs(query(matchesRef, where('status', '==', 'live')));
    return snapshot.docs.map(matchDoc => ({ ...matchDoc.data(), id: matchDoc.id }) as MatchRecord);
  }

  async getEvents(groupId: string, matchId: string): Promise<MatchEventRecord[]> {
    const snapshot = await getDocs(collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`));
    return snapshot.docs.map(eventDoc => ({ ...eventDoc.data(), id: eventDoc.id }) as MatchEventRecord);
  }

  /** Marks the matches abandoned and keeps their events. */
  async markAbandoned(groupId: string, matchIds: string[]): Promise<void> {
    if (!matchIds.length) return;
    const batch = writeBatch(this.firestore);
    for (const matchId of matchIds) {
      batch.update(doc(this.firestore, `groups/${groupId}/matches/${matchId}`), {
        status: 'abandoned',
        endedAt: new Date(),
        updatedAt: serverTimestamp()
      });
    }
    await batch.commit();
  }
}
