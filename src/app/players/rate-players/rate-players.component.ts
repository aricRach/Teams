import {Component, inject, linkedSignal} from '@angular/core';
import {PlayersService} from '../players.service';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {JsonPipe, NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-rate-players',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgIf,
    NgForOf,
    JsonPipe
  ],
  templateUrl: './rate-players.component.html',
  standalone: true,
  styleUrl: './rate-players.component.scss'
})
export class RatePlayersComponent {

  playersService = inject(PlayersService);

  ratings = linkedSignal<Record<string, FormControl>>(() => {
    const r = {}
    const players = this.playersService.flattenPlayers();
    players.forEach(player => {
      // @ts-ignore
      r[player.name] = new FormControl(5);
    });
    return r

  })

  submitRatings() {
    let ratingsObj = {} as Record<string, number>;
    for (const playerName in this.ratings()) {
      ratingsObj[playerName] = Number(this.ratings()[playerName].value);
    }
    this.playersService.submitRatings(ratingsObj).then();
  }
}
