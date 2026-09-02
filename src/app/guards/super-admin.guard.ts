import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../environments/environment';

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  if (auth.currentUser?.email === environment.superAdminEmail) return true;
  router.navigate(['/']);
  return false;
};
