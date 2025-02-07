import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private orgName!: string;
  private auth!: Auth; // Store Auth instance safely
  provider = new GoogleAuthProvider();
  user = signal<any>(null);

  constructor() {
    if (typeof window !== 'undefined') {  // ✅ Ensure we are in the browser
      this.auth = getAuth();
    }
  }

  setOrgName(orgName: string) {
    this.orgName = orgName;
  }

  googleLogin() {
    if (!this.auth) {
      console.error("Auth is not initialized. This might be an SSR environment.");
      return;
    }

    signInWithPopup(this.auth, this.provider)
      .then((result) => {
        const user = result.user;
        this.user.set(user);
        console.log("User signed in:", user);
      })
      .catch((error) => {
        console.error("Error during Google sign-in:", error.message);
      });
  }
}
