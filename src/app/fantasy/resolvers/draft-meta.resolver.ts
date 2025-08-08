import { ResolveFn } from '@angular/router';
import {inject} from '@angular/core';
import {FantasyApiService, FantasyMeta} from '../services/fantasy-api.service';
import {PlayersService} from '../../players/players.service';

export const draftMetaResolver: ResolveFn<FantasyMeta> = () => {
  const fantasyApiService = inject(FantasyApiService);
  const playersService = inject(PlayersService);
  return fantasyApiService.getFantasyMeta(playersService.selectedGroup().id);
};
