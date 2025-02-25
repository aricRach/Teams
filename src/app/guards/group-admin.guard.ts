import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';

export const groupAdminGuard: CanActivateFn = (route, state) => {
  const playersService = inject(PlayersService);
  const router = inject(Router);
  if(playersService.isAdmin() && !!playersService.selectedGroup()) {
    return true;
  }
  router.navigate(['/']);
  return false;
};
