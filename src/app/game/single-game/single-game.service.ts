import { computed, Injectable } from '@angular/core';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';

export const SINGLE_GAME_SLOTS = [1, 2] as const;

/**
 * Quick mode: either one match (slot 1 only, classic "playing" checkbox) or
 * two independent matches side by side (both slots, G1/G2 selector) - no
 * session, no standings either way. Match docs are written exactly like
 * today's single matches (no `mode`/`sessionId` tag), since
 * `startMatchOptions` isn't overridden.
 */
@Injectable()
export class SingleGameService extends ParallelSlotsGameService {
  constructor() {
    super(SINGLE_GAME_SLOTS, 1);
  }

  // Always the number of teams chosen on the group-selection screen.
  readonly teamCount = computed(() => this.selectedTeamCount);

  revealTeams(): void {
    void this.gameService.revealTeams();
  }
}
