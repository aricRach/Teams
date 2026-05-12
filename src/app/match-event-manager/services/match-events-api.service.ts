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
  updateDoc,
  where,
  writeBatch,
  increment
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { currentDate } from '../../utils/date-utils';
import { Player } from '../../players/models/player.model';
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

  getEvents(groupId: string, matchId: string): Observable<MatchEventRecord[]> {
    const eventsRef = collection(this.firestore, `groups/${groupId}/matches/${matchId}/events`);
    const q = query(eventsRef, orderBy('payload.timerMs', 'asc'));
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

  async applyMatchResultToPlayerStatistics(
    groupId: string,
    winners: Player[],
    losers: Player[],
    gameStatus: 'draw' | 'decided',
    wonTeamScore: number,
    loseTeamScore: number
  ): Promise<void> {
    const batch = writeBatch(this.firestore);
    const dateKey = currentDate;

    for (const player of winners) {
      const currentStats = player.statistics?.[dateKey] || {};
      const nextStats = {
        ...currentStats,
        wins: (currentStats.wins || 0) + (gameStatus === 'decided' ? 1 : 0),
        games: (currentStats.games || 0) + 1,
        draws: (currentStats.draws || 0) + (gameStatus === 'draw' ? 1 : 0),
        goals: (currentStats.goals || 0),
        loses: (currentStats.loses || 0),
        goalsConceded: (currentStats.goalsConceded || 0) + loseTeamScore
      };
      const statRef = doc(this.firestore, `groups/${groupId}/players/${player.id}/statistics/${dateKey}`);
      batch.set(statRef, nextStats, { merge: true });
    }

    for (const player of losers) {
      const currentStats = player.statistics?.[dateKey] || {};
      const nextStats = {
        ...currentStats,
        loses: (currentStats.loses || 0) + (gameStatus === 'decided' ? 1 : 0),
        games: (currentStats.games || 0) + 1,
        draws: (currentStats.draws || 0) + (gameStatus === 'draw' ? 1 : 0),
        wins: (currentStats.wins || 0),
        goals: (currentStats.goals || 0),
        goalsConceded: (currentStats.goalsConceded || 0) + wonTeamScore
      };
      const statRef = doc(this.firestore, `groups/${groupId}/players/${player.id}/statistics/${dateKey}`);
      batch.set(statRef, nextStats, { merge: true });
    }

    await batch.commit();
  }

  /**
   * Performs an atomic update of a match document, its associated events, and player statistics.
   * Uses Firestore increments for safe statistics updates.
   */
  async applyAtomicMatchSync(
    groupId: string,
    matchId: string,
    matchPatch: Partial<MatchRecord> | null,
    eventChanges: {
      add: Omit<MatchEventRecord, 'id'>[];
      update: { id: string; patch: Partial<MatchEventRecord> }[];
      deleteIds: string[];
    },
    playerStatsChanges: {
      playerId: string;
      statsDelta: Record<string, number>;
    }[],
    dateKey: string = currentDate
  ): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Update Match Doc
    if (matchPatch) {
      const matchRef = doc(this.firestore, `groups/${groupId}/matches/${matchId}`);
      batch.update(matchRef, { ...matchPatch, updatedAt: serverTimestamp() });
    }

    // 2. Process Event Changes
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

    // 3. Update Player Statistics using Atomicity (Increments)
    playerStatsChanges.forEach(({ playerId, statsDelta }) => {
      const statRef = doc(this.firestore, `groups/${groupId}/players/${playerId}/statistics/${dateKey}`);
      const updateObj: any = {};
      for (const [key, value] of Object.entries(statsDelta)) {
        updateObj[key] = increment(value);
      }
      batch.set(statRef, updateObj, { merge: true });
    });

    await batch.commit();
  }
}
