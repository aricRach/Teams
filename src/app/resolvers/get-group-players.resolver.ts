import {ResolveFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {PlayersService} from '../players/players.service';
import {finalize} from 'rxjs';
import {SpinnerService} from '../spinner.service';

export const getGroupPlayersResolver: ResolveFn<any> = (route, state) => {

  const playersService = inject(PlayersService);
  const spinnerService = inject(SpinnerService);
  const router = inject(Router);
  if(!playersService.selectedGroup()) {
    router.navigate(['/select-group']);
    return;
  }
  spinnerService.setIsLoading(true);
  return playersService.getAllActivePlayers().pipe(finalize(() => {
    spinnerService.setIsLoading(false);
  }),);
};
