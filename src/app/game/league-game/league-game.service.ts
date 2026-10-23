import { computed, Injectable, signal } from '@angular/core';
import { StartMatchOptions } from '../../match-event-manager/services/match-events-manager.service';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';
import { computeStandings, StandingsRow } from '../league-standings/standings.util';
import { formatDateToString } from '../../utils/date-utils';

export type { StandingsRow } from '../league-standings/standings.util';

export const LEAGUE_SLOTS = [1, 2] as const;

@Injectable()
export class LeagueGameService extends ParallelSlotsGameService {
  constructor() {
    super(LEAGUE_SLOTS, 1);
  }

  readonly teamCount = computed(() => this.selectedTeamCount);

  readonly sessionId = signal<string | null>(null);

  readonly canFinishSession = computed(() => !!this.sessionId() && !this.anySlotLive());

  readonly standings = computed<StandingsRow[]>(() => {
    const today = formatDateToString(new Date());
    const matches = this.allMatchData.matchesWithEvents()
      .map(x => x.match)
      .filter(m => m.mode === 'league' && m.status === 'completed' && m.createdAt?.seconds &&
        formatDateToString(new Date(m.createdAt.seconds * 1000)) === today);
    return computeStandings(matches);
  });

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
