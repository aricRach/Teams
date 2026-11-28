import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {AutoCompleteOption} from 'ui';
import {Player} from '../../players/models/player.model';

@Injectable()
export class ManagePlayersService {
  playersService = inject(PlayersService);

  selectedPlayer = signal<any>(null);

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
