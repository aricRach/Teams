import { Injectable } from '@angular/core';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';

export const SINGLE_GAME_SLOTS = [1, 2] as const;
const SINGLE_GAME_TEAM_COUNT = 4;

/**
 * Two independent matches running side by side - no session, no standings.
 * Match docs are written exactly like today's single matches (no `mode`/
 * `sessionId` tag), since `startMatchOptions` isn't overridden.
 */
@Injectable()
export class SingleGameService extends ParallelSlotsGameService {
  constructor() {
    super(SINGLE_GAME_SLOTS, SINGLE_GAME_TEAM_COUNT);
  }

  revealTeams(): void {
    void this.gameService.revealTeams();
  }
}
