import { computed, Injectable, signal } from '@angular/core';
import { StartMatchOptions } from '../../match-event-manager/services/match-events-manager.service';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';
import { computeStandings, StandingsRow } from '../league-standings/standings.util';

export type { StandingsRow } from '../league-standings/standings.util';

export const LEAGUE_SLOTS = [1, 2] as const;

/**
 * League state is in-memory only. A live league match doc is still tagged with
 * `slot` / `sessionId` / `teamKeys` (used by the standings table), but there is
 * no refresh-restore: reloading the page mid-game abandons the on-screen state.
 */
@Injectable()
export class LeagueGameService extends ParallelSlotsGameService {
  constructor() {
    super(LEAGUE_SLOTS, 1);
  }

  // Always the number of teams chosen on the group-selection screen.
  readonly teamCount = computed(() => this.selectedTeamCount);

  readonly sessionId = signal<string | null>(null);

  readonly canFinishSession = computed(() => !!this.sessionId() && !this.anySlotLive());

  readonly standings = computed<StandingsRow[]>(() => {
    const sid = this.sessionId();
    if (!sid) return [];
    const matches = this.allMatchData.matchesWithEvents()
      .map(x => x.match)
      .filter(m => m.mode === 'league' && m.sessionId === sid && m.status === 'completed');
    return computeStandings(matches);
  });

  /** Close the current session locally so the next Start opens a fresh one. */
  finishSession(): void {
    this.sessionId.set(null);
    this.assignments.set({});
    this.activeSlot.set(this.slots[0]);
  }

  protected override startMatchOptions(slot: number): StartMatchOptions {
    if (!this.sessionId()) {
      this.sessionId.set(this.newSessionId());
    }
    return {
      slot,
      mode: 'league',
      sessionId: this.sessionId() ?? undefined,
      teamKeys: this.slotTeams(slot)
    };
  }

  private newSessionId(): string {
    const c: any = globalThis.crypto;
    if (c?.randomUUID) return c.randomUUID();
    return `ls-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
