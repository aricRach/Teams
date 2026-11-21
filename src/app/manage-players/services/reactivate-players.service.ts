import {computed, inject, Injectable, linkedSignal, signal} from '@angular/core';
import {Player} from '../../players/models/player.model';
import {AutoCompleteOption, ModalsService} from 'ui';
import {PlayersService} from '../../players/players.service';

@Injectable()
export class ReactivatePlayersService {
  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);

  selectedPlayer = signal<any>(null)
  isReactivating = this.playersService.setPlayerActiveStatus.pending;

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

  /** Guests are left out: they're brought back from the Team Builder's Guests section. */
  setInactivePlayersOptions(inActivePlayers: Player[]) {
    this.allPlayersArray.set(inActivePlayers.filter(player => !player.isGuest))
  }

  reactivatePlayer() {
    this.modalsService.openConfirmModal({
      title: `Reactivate ${this.selectedPlayer()?.name}?`,
      description: 'They can be picked for teams again, their statistics show again, and if they have a valid email they get access to the app.',
      confirmBtn: 'reactivate',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.playersService.setPlayerActiveStatus.run(this.selectedPlayer(), true).then(done => {
          if (!done) return;
          this.allPlayersArray.update((allPlayers: Player[]) => {
            return [...allPlayers].filter((p: Player) => p.id !== this.selectedPlayer().id);
          });
          this.selectedPlayer.set(null);
        })
      }
    })
  }
}
