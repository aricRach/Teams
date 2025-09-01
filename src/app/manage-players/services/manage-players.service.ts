import {computed, inject, Injectable, linkedSignal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {ModalsService} from 'ui';

@Injectable()
export class ManagePlayersService {
  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);

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

  onChangePlayer() {
    this.selectedPlayer.set(this.allPlayersArray().filter((p => p.name === this.selectedPlayerOption))[0]);
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

}
