import {computed, inject, Injectable, linkedSignal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {AutoCompleteOption, ModalsService} from 'ui';
import {Player} from '../../players/models/player.model';
import {AdminControlService} from '../../user/admin-control.service';

@Injectable()
export class ManagePlayersService {
  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);
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

  deletePlayer() {
    this.modalsService.openConfirmModal({
      description: `Are you sure you want to delete ${this.selectedPlayer().name}?`,
    }).afterClosed().subscribe((result) => {
      if(result) {
        this.playersService.setPlayerActiveStatus(this.selectedPlayer(), false).then(() => this.selectedPlayer.set(null))
      }
    });
  }

  removeSelectedPlayer() {
    this.selectedPlayer.set(null);
  }
}
