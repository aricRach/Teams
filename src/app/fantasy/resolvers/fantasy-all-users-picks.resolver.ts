import {inject} from '@angular/core';
import {SpinnerService} from '../../spinner.service';
import {FantasyApiService} from '../services/fantasy-api.service';
import {PlayersService} from '../../players/players.service';

export const fantasyAllUsersPicksResolver = () => {
  const spinnerService = inject(SpinnerService);
  const fantasyApiService = inject(FantasyApiService);
  const playersService = inject(PlayersService);

  spinnerService.setIsLoading(true);
  return fantasyApiService.getAllFantasyDataWithUserPicks(playersService.selectedGroup().id).then((fantasyData) => fantasyData)
    .finally(() =>spinnerService.setIsLoading(false))
};
