import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {Auth} from "@angular/fire/auth";

export const signInPageGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (!auth.currentUser) return true;
  const redirectTo = localStorage.getItem('redirectTo') || '/select-group';
  localStorage.removeItem('redirectTo');
  // parseUrl keeps query params intact (createUrlTree([url]) would encode the '?').
  return router.parseUrl(redirectTo);
};
