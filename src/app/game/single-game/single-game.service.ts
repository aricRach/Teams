import { computed, Injectable } from '@angular/core';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';

export const SINGLE_GAME_SLOTS = [1, 2] as const;

@Injectable()
export class SingleGameService extends ParallelSlotsGameService {
  constructor() {
    super(SINGLE_GAME_SLOTS, 1);
  }

  readonly teamCount = computed(() => this.selectedTeamCount);

  readonly isRevealingTeams = this.gameService.reveal.pending;

  revealTeams(): void {
    this.gameService.revealTeams();
  }
}
