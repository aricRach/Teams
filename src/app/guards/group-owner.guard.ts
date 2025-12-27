import { CanActivateFn } from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';

export const groupOwnerGuard: CanActivateFn = (route, state) => {

  const playersService = inject(PlayersService);

  return playersService.isGroupOwner();
};
