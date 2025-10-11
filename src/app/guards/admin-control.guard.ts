import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AdminControlService} from '../user/admin-control.service';

export const adminControlGuard: CanActivateFn = (route, state) => {
  const adminControlService = inject(AdminControlService);
  const router = inject(Router);
  if(adminControlService.getAdminControl().showProtectedPages) {
    return true;
  }
  router.navigate(['/']);
  return false;
};
