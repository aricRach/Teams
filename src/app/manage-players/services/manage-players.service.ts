import {computed, inject, Injectable, linkedSignal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {AutoCompleteOption} from 'ui';
import {Player} from '../../players/models/player.model';
import {AdminControlService} from '../../user/admin-control.service';

@Injectable()
export class ManagePlayersService {
  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);

  selectedPlayerOption = '';

  // linked signal - *computed* when allPlayersArray changed allow to load the newest player details.
  // initial value is null.
  // *able to change*.
  selectedPlayer = linkedSignal<any>(() => {
    return this.allPlayersArray().filter((p => p.name === this.selectedPlayerOption))[0] || null;
  });

  allPlayersArray = computed(() => {
    return [...this.playersService.flattenPlayers()]
  });

  autoCompletePlayersOptions = computed(() => {
    return [...this.playersService.flattenPlayers().map((p: Player) =>
      ({value: p.id, alias: p.name}))];
  });

  isAllowToViewEditPages = computed(() => this.adminControlService.getAdminControl().showProtectedPages)

  isAdmin = computed(() => this.playersService.isAdmin())

  onChangePlayer(option: AutoCompleteOption ) {
    this.selectedPlayer.set(this.allPlayersArray().filter((p => p.id === option.value))[0]);
  }

  removeSelectedPlayer() {
    this.selectedPlayer.set(null);
  }
}
