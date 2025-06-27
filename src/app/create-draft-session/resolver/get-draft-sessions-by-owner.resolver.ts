import {ResolveFn} from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../../players/players.service';

export const getDraftSessionsByOwnerResolver: ResolveFn<Promise<any>> = async (route, state) => {

  const playersService = inject(PlayersService);
  const sessions = await playersService.getDraftSessionsByCreator();
  return sessions ? sessions[0] : null;
};
