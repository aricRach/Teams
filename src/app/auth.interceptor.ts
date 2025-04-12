
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap, of } from 'rxjs';
import {Auth} from '@angular/fire/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

const auth = inject(Auth);
  const user = auth.currentUser;
  if (!user) {
    return next(req); // no user, proceed without auth
  }

      return from(user.getIdToken()).pipe(
        switchMap(token => {
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          return next(authReq);
        })
      );
};
