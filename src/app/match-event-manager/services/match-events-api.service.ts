import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  Firestore,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { MatchEventRecord, MatchRecord } from '../models/match-event.model';

@Injectable({
  providedIn: 'root'
})
export class MatchEventsApiService {
  private firestore = inject(Firestore);

  /**
   * Mark every `live` match in the group as abandoned (cleanup before starting a new one).
   */
  async abandonAllLiveMatches(groupId: string): Promise<void> {
    const matchesRef = collection(this.firestore, `groups/${groupId}/matches`);
    const q = query(matchesRef, where('status', '==', 'live'));
    const snap = await getDocs(q);
    if (snap.empty) {
      return;
    }
    const batch = writeBatch(this.firestore);
    const endedAt = new Date();
    snap.docs.forEach((d) => {
      batch.update(d.ref, {
        status: 'abandoned',
        endedAt,
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  }

  async createMatch(groupId: string, match: Omit<MatchRecord, 'id'>): Promise<string> {
    const matchesRef = collection(this.firestore, `groups/${groupId}/matches`);
    const matchDoc = {
      ...match,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(matchesRef, matchDoc);
    return docRef.id;
  }

  async updateMatch(groupId: string, matchId: string, patch: Partial<MatchRecord>): Promise<void> {
    const ref = doc(this.firestore, `groups/${groupId}/matches/${matchId}`);
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp()
    });
  }

  async updateMatches(groupId: string, matchIds: string[], patch: Partial<MatchRecord>): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const matchId of matchIds) {
      const ref = doc(this.firestore, `groups/${groupId}/matches/${matchId}`);
      batch.update(ref, {...patch, updatedAt: serverTimestamp()});
    }
    await batch.commit();
  }

  async addEvent(groupId: string, matchId: string, event: Omit<MatchEventRecord, 'id'>): Promise<string> {
    const eventsRef = collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`);
    const eventDoc = {
      ...event,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(eventsRef, eventDoc);
    return docRef.id;
  }

  getMatches(groupId: string): Observable<MatchRecord[]> {
    const matchesRef = collection(this.firestore, `groups/${groupId}/matches`);
    const q = query(matchesRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<MatchRecord[]>;
  }

  // For the matches timeline — orders by game minute, excludes events without timerMs (e.g. stat_correction)
  getEvents(groupId: string, matchId: string): Observable<MatchEventRecord[]> {
    const eventsRef = collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`);
    const q = query(eventsRef, orderBy('payload.timerMs', 'asc'));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<MatchEventRecord[]>;
  }

  // For statistics computation — orders by createdAt so all event types are included
  getAllEvents(groupId: string, matchId: string): Observable<MatchEventRecord[]> {
    const eventsRef = collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`);
    const q = query(eventsRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as unknown as Observable<MatchEventRecord[]>;
  }

  async updateEvent(groupId: string, matchId: string, eventId: string, patch: Partial<MatchEventRecord>): Promise<void> {
    const ref = doc(this.firestore, `groups/${groupId}/matches/${matchId}/events/${eventId}`);
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp()
    });
  }

  async deleteEvent(groupId: string, matchId: string, eventId: string): Promise<void> {
    const ref = doc(this.firestore, `groups/${groupId}/matches/${matchId}/events/${eventId}`);
    await setDoc(ref, { deletedAt: serverTimestamp() }, { merge: true });
  }

  async deleteEvents(groupId: string, matchId: string, eventIds: string[]): Promise<void> {
    if (!eventIds.length) return;
    const batch = writeBatch(this.firestore);
    for (const eventId of eventIds) {
      const eventRef = doc(this.firestore, `groups/${groupId}/matches/${matchId}/events/${eventId}`);
      batch.set(eventRef, { deletedAt: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  }

  async addEvents(groupId: string, matchId: string, events: Omit<MatchEventRecord, 'id'>[]): Promise<void> {
    if (!events.length) return;
    const batch = writeBatch(this.firestore);
    const eventsRef = collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`);
    for (const event of events) {
      const eventRef = doc(eventsRef);
      batch.set(eventRef, { ...event, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    await batch.commit();
  }

  async createCorrectionMatch(groupId: string, dateKey: string, createdBy: string, aliases: Record<string, string>): Promise<string> {
    const [day, month, year] = dateKey.split('-').map(Number);
    const matchDate = new Date(year, month - 1, day, 12, 0, 0);
    const matchesRef = collection(this.firestore, `groups/${groupId}/matches`);
    const docRef = await addDoc(matchesRef, {
      status: 'correction',
      createdBy,
      createdAt: Timestamp.fromDate(matchDate),
      updatedAt: serverTimestamp(),
      // Best-effort: reflects alias state at doc-creation time, not the backdated dateKey,
      // since no historical alias value can be recovered from before this field existed.
      teamAliasSnapshot: aliases
    });
    return docRef.id;
  }

  async applyAtomicMatchSync(
    groupId: string,
    matchId: string,
    matchPatch: Partial<MatchRecord> | null,
    eventChanges: {
      add: Omit<MatchEventRecord, 'id'>[];
      update: { id: string; patch: Partial<MatchEventRecord> }[];
      deleteIds: string[];
    }
  ): Promise<void> {
    const batch = writeBatch(this.firestore);

    if (matchPatch) {
      const matchRef = doc(this.firestore, `groups/${groupId}/matches/${matchId}`);
      batch.update(matchRef, { ...matchPatch, updatedAt: serverTimestamp() });
    }

    eventChanges.add.forEach((event) => {
      const ref = doc(collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`));
      batch.set(ref, {
        ...event,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    eventChanges.update.forEach(({ id, patch }) => {
      const ref = doc(this.firestore, `groups/${groupId}/matches/${matchId}/events/${id}`);
      batch.update(ref, {
        ...patch,
        updatedAt: serverTimestamp()
      });
    });

    eventChanges.deleteIds.forEach((id) => {
      const ref = doc(this.firestore, `groups/${groupId}/matches/${matchId}/events/${id}`);
      batch.update(ref, {
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
  }
}
