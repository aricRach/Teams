import {Component, inject, input, linkedSignal} from '@angular/core';
import {PlayersService} from '../players.service';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {JsonPipe, NgForOf, NgIf} from '@angular/common';
import {PopupsService} from 'ui';

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
  popupsService = inject(PopupsService);
  groupId = input<string>('');
  allPlayers = input<any>();

  ratings = linkedSignal(() => {
    const group: Record<string, FormControl> = {};

    this.allPlayers().forEach((player: any) => {
      group[player.id] = new FormControl(
        5,
        [
          Validators.required,
          Validators.min(5),
          Validators.max(10)
        ]
      );
    });

    return new FormGroup(group);
  });

  submitRatings() {
    const form = this.ratings();

    if (form.invalid) {
      this.popupsService.addErrorPopOut('Rating must be between 5 and 10');
      return;
    }

    const rawRatings = form.value;

    const finalRatings: Record<string, { name: string; rating: number }> = {};

    this.allPlayers().forEach((player: any) => {
      if(!isNaN(rawRatings[player.id])) {
        finalRatings[player.id] = {
          name: player.name,
          rating: rawRatings[player.id]
        };
      }
    });
    this.playersService.submitRatings(this.groupId(), finalRatings).then();
  }
}
