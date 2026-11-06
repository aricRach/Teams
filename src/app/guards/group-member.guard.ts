import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';

/** Blocks member-only pages for viewers who opened a shared link without being a member. */
export const groupMemberGuard: CanActivateFn = () => {
  const playersService = inject(PlayersService);
  return playersService.isMember() || inject(Router).createUrlTree([playersService.groupUrl('statistics')]);
};
