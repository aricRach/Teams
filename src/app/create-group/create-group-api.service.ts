import { inject, Injectable } from '@angular/core';
import { addDoc, collection, Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class CreateGroupApiService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async createGroup(name: string, members: string[], admins: string[]): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user?.email) return null;

    const finalMembers = members.includes(user.email) ? members : [user.email, ...members];
    const finalAdmins  = admins.includes(user.email)  ? admins  : [user.email, ...admins];

    try {
      const docRef = await addDoc(collection(this.firestore, 'groups'), {
        name,
        createdBy: user.email,
        members: finalMembers,
        admins: finalAdmins,
        createdAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      return null;
    }
  }
}
