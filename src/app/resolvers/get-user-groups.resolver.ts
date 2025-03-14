import { ResolveFn } from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';

export const getUserGroupsResolver: ResolveFn<any> = (route, state) => {

  const playersService = inject(PlayersService);
  return playersService.getUserCreatedGroups();
};
