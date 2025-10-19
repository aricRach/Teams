import {inject} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {SpinnerService} from '../../spinner.service';
import {finalize, of, tap} from 'rxjs';
import {Player} from '../../players/models/player.model';

export const inactivePlayersResolver = () => {
  const playersService = inject(PlayersService);
  const spinnerService = inject(SpinnerService);
  if(playersService.getInactivePlayers()) {
    return of(playersService.getInactivePlayers());
  }
  spinnerService.setIsLoading(true);
  return playersService.getPlayersFromDB(false).pipe(
    tap((data: Player[]) => {
        playersService.setInactivePlayers(data)
    }),
    finalize(() => {
      spinnerService.setIsLoading(false);
    })
  )
};
