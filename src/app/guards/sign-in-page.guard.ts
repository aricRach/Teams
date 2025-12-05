import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {Auth} from "@angular/fire/auth";

export const signInPageGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const redirectTo = localStorage.getItem('redirectTo') || '/select-group';

  return !auth.currentUser ? true : router.navigate([redirectTo]);
};
