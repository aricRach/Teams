import { computed, Injectable } from '@angular/core';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';

export const SINGLE_GAME_SLOTS = [1, 2] as const;
const SINGLE_GAME_TEAM_COUNT = 4;

/**
 * Quick mode: either one match (slot 1 only, classic "playing" checkbox, the
 * board's normal team count) or two independent matches side by side (both
 * slots, G1/G2 selector, 4 teams) - no session, no standings either way.
 * Match docs are written exactly like today's single matches (no `mode`/
 * `sessionId` tag), since `startMatchOptions` isn't overridden.
 */
@Injectable()
export class SingleGameService extends ParallelSlotsGameService {
  constructor() {
    super(SINGLE_GAME_SLOTS, 1);
  }

  // One match doesn't need the 4-team league roster - keep the board's normal count.
  readonly teamCount = computed(() =>
    this.matchCount() === 2 ? SINGLE_GAME_TEAM_COUNT : this.previousTeamCount
  );

  revealTeams(): void {
    void this.gameService.revealTeams();
  }
}
