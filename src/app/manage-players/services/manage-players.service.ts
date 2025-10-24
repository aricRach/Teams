import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {AutoCompleteOption} from 'ui';
import {Player} from '../../players/models/player.model';
import {AdminControlService} from '../../user/admin-control.service';

@Injectable()
export class ManagePlayersService {
  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);

  selectedPlayer = signal<any>(null);

  innerTabs = computed(() => {
    return [
      {
        link: 'player-progress',
        title: 'Player progress',
        tooltip: '',
        isDisabled: false,
      },
      ...(
        this.playersService.isAdmin() ?
          [
            {
            link: 'edit-player',
            title: 'Edit player',
            tooltip: this.adminControlService.getAdminControl().showProtectedPages ? '' : "In order to see this page enable 'show protected pages' in admin control",
            isDisabled: !this.adminControlService.getAdminControl().showProtectedPages,
          },
            {
              link: 'edit-player-statistics',
              title: 'Edit last statistics',
              tooltip: this.adminControlService.getAdminControl().showProtectedPages ? '' : "In order to see this page enable 'show protected pages' in admin control",
              isDisabled: !this.adminControlService.getAdminControl().showProtectedPages,
            },
          ]
          : []
      )
    ]
  })
  allPlayersArray = computed(() => {
    return [...this.playersService.flattenPlayers()]
  });

  autoCompletePlayersOptions = computed(() => {
    return [...this.playersService.flattenPlayers().map((p: Player) =>
      ({value: p.id, alias: p.name}))];
  });


  onChangePlayer(option: AutoCompleteOption ) {
    this.selectedPlayer.set(this.allPlayersArray().filter((p => p.id === option.value))[0]);
  }

  removeSelectedPlayer() {
    this.selectedPlayer.set(null);
  }
}
