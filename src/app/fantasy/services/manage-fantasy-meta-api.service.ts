import {inject, Injectable} from '@angular/core';
import {doc, Firestore, setDoc} from '@angular/fire/firestore';
import {FantasyMeta} from './fantasy-api.service';

@Injectable({
  providedIn: 'root'
})
export class ManageFantasyMetaApiService {

  private firestore = inject(Firestore);

  async setFantasyMeta(groupId: string, meta: FantasyMeta) {
    const metaRef = doc(this.firestore, `groups/${groupId}/fantasyDrafts/meta`);
    await setDoc(metaRef, {...meta, isActive: true}, { merge: true });
  }
}
