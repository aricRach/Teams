import {inject, Injectable} from '@angular/core';
import {collection, doc, Firestore, getDoc, getDocs, setDoc} from '@angular/fire/firestore';

export interface FantasyPick {
  playerIds: string[];
  createdAt?: string;
  updatedAt?: string;
  captain: string;
  userId: string;
  userName: string;
}

export interface FantasyMeta {
  nextDate: string;
  lastCompleted?: string;
  isActive?: boolean;
  numberOfPicks: number
}

export interface FantasyData {
  [date: string] : {userPicks: FantasyPick[]}
}
@Injectable({
  providedIn: 'root'
})
export class FantasyApiService {

  private firestore = inject(Firestore);

  async getUserFantasyPicksByDate(
    groupId: string,
    dateId: string,
    userId: string
  ): Promise<FantasyPick | null> {
    const ref = doc(
      this.firestore,
      `groups/${groupId}/fantasyDrafts/${dateId}/userPicks/${userId}`
    );
    const snap = await getDoc(ref);
    debugger
    return snap.exists() ? snap.data() as FantasyPick : null;
  }

  async getAllFantasyData(groupId: string): Promise<FantasyData[]> {
    const ref = collection(this.firestore, `groups/${groupId}/fantasyDrafts`);
    const snap = await getDocs(ref);
    debugger
    return snap.docs.map(doc => doc.data() as FantasyData);
  }

  async getAllFantasyDataWithUserPicks(groupId: string): Promise<FantasyData> {
    const fantasyDraftsRef = collection(this.firestore, `groups/${groupId}/fantasyDrafts`);
    const fantasyDraftsSnap = await getDocs(fantasyDraftsRef);

    const fullData: Record<string, any> = {};
    for (const draftDoc of fantasyDraftsSnap.docs) {
      const dateId = draftDoc.id;
      if(dateId === 'meta') continue;
      const draftData = draftDoc.data();
      try {
        const userPicksRef = collection(this.firestore, `groups/${groupId}/fantasyDrafts/${dateId}/userPicks`);
        const userPicksSnap = await getDocs(userPicksRef);
        const userPicks = userPicksSnap.docs.map(pickDoc => ({
          userId: pickDoc.id,
          ...pickDoc.data(),
        }));
        fullData[dateId] = {
          ...draftData,
          userPicks
        };
      } catch (err) {
        console.error(`Failed to get userPicks for ${dateId}:`, err);
      }
    }

    return fullData;
  }

  async saveFantasyDraft(groupId: string, date: string, userId: string, playerIds: string[], captain: string, userName: string) {
    // ensure the date document exists
    const dateDocRef = doc(this.firestore, `groups/${groupId}/fantasyDrafts/${date}`);
    await setDoc(dateDocRef, { createdAt: new Date() }, { merge: true });
    // save the user pick
    const userPickRef = doc(this.firestore, `groups/${groupId}/fantasyDrafts/${date}/userPicks/${userId}`);
    await setDoc(userPickRef, { playerIds, captain, userName }, { merge: true });
  }

  async setFantasyMeta(groupId: string, meta: FantasyMeta) {
    const metaRef = doc(this.firestore, `groups/${groupId}/fantasyDrafts/meta`);
    await setDoc(metaRef, meta, { merge: true });
  }

  async getFantasyMeta(groupId: string): Promise<FantasyMeta> {
    const metaRef = doc(this.firestore, `groups/${groupId}/fantasyDrafts/meta`);
    const snapshot = await getDoc(metaRef);

    return snapshot.data() as FantasyMeta
  }
}
