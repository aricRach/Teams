import {inject, Injectable} from '@angular/core';
import {PlayersService} from '../players.service';

@Injectable()
export class RatePlayersService {
  private playersService = inject(PlayersService);

  submitRatings(groupId: string, ratings: Record<string, {name: string; rating: number}>) {
    return this.playersService.submitRatings(groupId, ratings);
  }
}
