import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {Auth} from '@angular/fire/auth';

export const authRoutesGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  localStorage.setItem('redirectTo', state.url);
  if(!!auth.currentUser) {
    localStorage.removeItem('redirectTo');
    return true;
  }
  return false;
};
