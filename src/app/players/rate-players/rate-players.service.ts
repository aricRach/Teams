import {inject, Injectable} from '@angular/core';
import {PlayersService} from '../players.service';

@Injectable()
export class RatePlayersService {
  private playersService = inject(PlayersService);

  readonly isSubmittingRatings = this.playersService.submitRatings.pending;

  submitRatings(groupId: string, ratings: Record<string, {name: string; rating: number}>) {
    return this.playersService.submitRatings.run(groupId, ratings);
  }
}
