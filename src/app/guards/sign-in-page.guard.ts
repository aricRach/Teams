import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {Auth, authState} from "@angular/fire/auth";
import {map, take} from 'rxjs';

export const signInPageGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (!user) return true;
      const redirectTo = localStorage.getItem('redirectTo') || '/select-group';
      localStorage.removeItem('redirectTo');
      return router.createUrlTree([redirectTo]);
    })
  );
};
