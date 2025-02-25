import {Injectable, PLATFORM_ID, Inject, signal, inject} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firebaseApp!: FirebaseApp;
  private auth!: Auth;
  provider = new GoogleAuthProvider();
  // user = signal<any>(null);
  router = inject(Router);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  /** Lazy Initialization (Only Runs When Needed) */
  private ensureFirebaseInitialized() {
    if (!this.firebaseApp && isPlatformBrowser(this.platformId)) {
      this.firebaseApp = initializeApp(environment.firebase);
      this.auth = getAuth(this.firebaseApp);
    }
  }

  googleLogin() {
    this.ensureFirebaseInitialized(); // Initialize Firebase only if not already initialized
    if (!this.auth) {
      console.error("Firebase Auth is not available (Possibly SSR mode).");
      return;
    }

    signInWithPopup(this.auth, this.provider)
      .then((result) => {
        const user = result.user;
        // this.user.set(user);
        console.log("User signed in:", user);
        this.router.navigate(['/select-group']);
      })
      .catch((error) => {
        console.error("Error during Google sign-in:", error.message);
      });
  }
}
