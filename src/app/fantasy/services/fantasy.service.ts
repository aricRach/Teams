import {computed, inject, Injectable} from '@angular/core';
import {PlayersService} from '../../players/players.service';

@Injectable()
export class FantasyService {
  playersService = inject(PlayersService);
  isAdmin = computed(() => this.playersService.isAdmin());
}
