import { Injectable, PLATFORM_ID, Inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private orgName!: string;
  private firebaseApp!: FirebaseApp;
  private auth!: Auth;
  provider = new GoogleAuthProvider();
  user = signal<any>(null);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  /** ✅ Lazy Initialization (Only Runs When Needed) */
  private ensureFirebaseInitialized() {
    if (!this.firebaseApp && isPlatformBrowser(this.platformId)) {
      this.firebaseApp = initializeApp(environment.firebase);
      this.auth = getAuth(this.firebaseApp);
    }
  }

  setOrgName(orgName: string) {
    this.orgName = orgName;
  }

  googleLogin() {
    this.ensureFirebaseInitialized(); // ✅ Initialize Firebase only if not already initialized
    if (!this.auth) {
      console.error("Firebase Auth is not available (Possibly SSR mode).");
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
