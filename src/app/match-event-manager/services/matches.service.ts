import {computed, inject, Injectable} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {InnerTab} from '../../shared/inner-tabs/inner-tabs.component';

@Injectable({
  providedIn: 'root',
})
export class MatchesService {

  playersService = inject(PlayersService);

  readonly innerTabs= computed(() => ([
    {
      link: 'timeline',
      title: 'Timeline',
      tooltip: '',
      isDisabled: false,
    },
    ...(
      this.playersService.isAdmin() ? [{
      link: 'manage-events',
      title: 'Manage Events',
      tooltip: '',
      isDisabled: false,
      show: true
    }] : []),
  ]));

}
