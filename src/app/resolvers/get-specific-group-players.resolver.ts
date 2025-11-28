import { ResolveFn } from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';

export const getSpecificGroupPlayersResolver: ResolveFn<any> = (route, state) => {
  const playersService = inject(PlayersService);
  const groupId = route.params['groupId'];
  if(!groupId) {
    return;
  }
  return playersService.getSpecificGroupPlayers(groupId)
};
