import { inject, Injectable } from '@angular/core';
import { arrayRemove, arrayUnion, doc, Firestore, updateDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class ManageGroupApiService {
  private firestore = inject(Firestore);

  addAdmin(groupId: string, email: string) {
    return updateDoc(doc(this.firestore, `groups/${groupId}`), { admins: arrayUnion(email) });
  }

  removeAdmin(groupId: string, email: string) {
    return updateDoc(doc(this.firestore, `groups/${groupId}`), { admins: arrayRemove(email) });
  }

  addMember(groupId: string, email: string) {
    return updateDoc(doc(this.firestore, `groups/${groupId}`), { members: arrayUnion(email) });
  }

  removeMember(groupId: string, email: string) {
    return updateDoc(doc(this.firestore, `groups/${groupId}`), { members: arrayRemove(email) });
  }
}
