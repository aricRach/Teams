import {inject, Injectable} from '@angular/core';
import {arrayRemove, arrayUnion, doc, Firestore, updateDoc} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class MembersApiService {

  private firestore = inject(Firestore);

  addMember(groupId: string, email: string) {
    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    return updateDoc(groupDocRef, {
      members: arrayUnion(email)
    });
  }

  async replaceMember(groupId: string, oldEmail: string, newEmail: string): Promise<void> {
    const groupDocRef = doc(this.firestore, `groups/${groupId}`);

    await updateDoc(groupDocRef, {
      members: arrayRemove(oldEmail),
    });

    await updateDoc(groupDocRef, {
      members: arrayUnion(newEmail),
    });
  }

  async removeMember(groupId: string, email: string) {
    const groupDocRef = doc(this.firestore, `groups/${groupId}`);
    await updateDoc(groupDocRef, {
      members: arrayRemove(email),
    });
  }
}
