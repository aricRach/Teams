import { inject, Injectable } from '@angular/core';
import { doc, docData, Firestore, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export type Position = 'DEF' | 'MID' | 'FWD';

export interface PositionedPlayer {
  name: string;
  position: Position;
}

export interface RevealTeam {
  name: string;
  rating: number;
  attackScore: number;
  defenseScore: number;
  players: PositionedPlayer[];
}

export interface RevealSnapshot {
  teams: RevealTeam[];
  savedAt: any;
}

@Injectable({ providedIn: 'root' })
export class RevealApiService {
  private firestore = inject(Firestore);

  getSnapshot(groupId: string): Observable<RevealSnapshot | undefined> {
    const ref = doc(this.firestore, `groups/${groupId}/reveal/snapshot`);
    return docData(ref) as Observable<RevealSnapshot | undefined>;
  }

  saveSnapshot(groupId: string, snapshot: RevealSnapshot): Promise<void> {
    const ref = doc(this.firestore, `groups/${groupId}/reveal/snapshot`);
    return setDoc(ref, { ...snapshot, savedAt: serverTimestamp() });
  }
}
