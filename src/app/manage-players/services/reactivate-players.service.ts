import {computed, inject, Injectable, linkedSignal, signal} from '@angular/core';
import {Player} from '../../players/models/player.model';
import {AutoCompleteOption, ModalsService} from 'ui';
import {PlayersService} from '../../players/players.service';

@Injectable()
export class ReactivatePlayersService {
  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);

  selectedPlayer = signal<any>(null)

  allPlayersArray = signal<any>(null);

  names = computed(() => this.allPlayersArray().map((p: { name: any; }) => p.name))
  autoCompletePlayersOptions = computed(() => {
    return [...this.allPlayersArray()?.map((p: Player) =>
      ({value: p.id, alias: p.name}))];
  });

  onChangePlayer(option: AutoCompleteOption) {
    this.selectedPlayer.set(this.allPlayersArray().filter(((p: Player) => p.id === option.value))[0]);
  }

  removeSelectedPlayer() {
    this.selectedPlayer.set(null);
  }

  setInactivePlayersOptions(inActivePlayers: Player[]) {
    this.allPlayersArray.set(inActivePlayers)
  }

  reactivatePlayer() {
    this.modalsService.openConfirmModal({
      title: 'Are you sure?',
      description: `By reactivate <b>${this.selectedPlayer()?.name}</b>, he will be available again, his statistics will be shown and if he has a valid email he will get access for the application`,
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.playersService.setPlayerActiveStatus(this.selectedPlayer(), true).then(() => {
          this.allPlayersArray.update((allPlayers: Player[]) => {
            return [...allPlayers].filter((p: Player) => p.id !== this.selectedPlayer().id);
          });
          this.selectedPlayer.set(null);
        })
      }
    })
  }
}
