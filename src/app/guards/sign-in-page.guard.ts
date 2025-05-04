import { CanActivateFn } from '@angular/router';

export const signInPageGuard: CanActivateFn = (route, state) => {
  return true;
};
