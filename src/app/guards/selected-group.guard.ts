import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';

export const selectedGroupGuard: CanActivateFn = () => {
  const playersService = inject(PlayersService);
  return !!playersService.selectedGroup() || inject(Router).createUrlTree(['/select-group']);
};
