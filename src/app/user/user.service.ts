import {Injectable, PLATFORM_ID, Inject, signal, inject} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { environment } from '../../environments/environment';
import {Router} from '@angular/router';
import {SpinnerService} from '../spinner.service';
import {PopupsService} from 'ui';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firebaseApp!: FirebaseApp;
  private auth!: Auth;
  private spinnerService = inject(SpinnerService);
  popoutService = inject(PopupsService);
  provider = new GoogleAuthProvider();
  user = signal<any>(null);
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
    if(this.auth.currentUser) {
      this.user.set(this.auth.currentUser);
      const redirectTo = localStorage.getItem('redirectTo') || '/select-group';
      localStorage.setItem('redirectTo', '');
      this.router.navigate([redirectTo]).then(() => {
        // @ts-ignore
        this.popoutService.addSuccessPopOut(`welcome ${this.auth.currentUser.displayName}`)
      });

    } else {
      this.spinnerService.setIsLoading(true);
      const redirectTo = localStorage.getItem('redirectTo') || '/select-group';
      localStorage.setItem('redirectTo', '');
      signInWithPopup(this.auth, this.provider)
        .then((result) => {
          this.user.set(result.user);
          this.router.navigate([redirectTo]).then(() => this.spinnerService.setIsLoading(false));
        })
        .catch((error) => {
          this.spinnerService.setIsLoading(false);
          console.error("Error during Google sign-in:", error.message);
        });
    }
    }
}
