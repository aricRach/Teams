import { computed, Injectable, signal } from '@angular/core';
import { StartMatchOptions } from '../../match-event-manager/services/match-events-manager.service';
import { ParallelSlotsGameService } from '../shared/parallel-slots-game.service';
import { computeStandings, StandingsRow } from '../league-standings/standings.util';
import { formatDateToString } from '../../utils/date-utils';
import { MatchRecord } from '../../match-event-manager/models/match-event.model';
import { toLiveMatchResult } from '../league-standings/live-match-result.util';

export type { StandingsRow } from '../league-standings/standings.util';

export const LEAGUE_SLOTS = [1, 2] as const;

@Injectable()
export class LeagueGameService extends ParallelSlotsGameService {
  constructor() {
    super(LEAGUE_SLOTS, 1);
  }

  readonly sessionId = signal<string | null>(null);

  readonly canFinishSession = computed(() => !!this.sessionId() && !this.anySlotLive());

  private readonly todaysCompletedMatches = computed<MatchRecord[]>(() => {
    const today = formatDateToString(new Date());
    return this.allMatchData.matchesWithEvents()
      .map(x => x.match)
      .filter(m => m.mode === 'league' && m.status === 'completed' && m.createdAt?.seconds &&
        formatDateToString(new Date(m.createdAt.seconds * 1000)) === today);
  });

  // Running games count with their current score, so the table updates live with every goal.
  // A game that was just ended can still look live for a moment after its saved result arrives,
  // so skip it then to avoid counting it twice.
  private readonly liveMatchResults = computed<MatchRecord[]>(() => {
    const completedMatchIds = new Set(this.todaysCompletedMatches().map(match => match.id));
    return this.slotViewModels()
      .filter(slotViewModel => slotViewModel.live)
      .filter(slotViewModel => !completedMatchIds.has(this.matchEvents.liveMatchIdFor(slotViewModel.slot) ?? undefined))
      .map(slotViewModel => toLiveMatchResult(slotViewModel.teamKeys, slotViewModel.score))
      .filter((match): match is MatchRecord => match !== null);
  });

  readonly playingTeamKeys = computed<string[]>(() =>
    this.slotViewModels()
      .filter(slotViewModel => slotViewModel.live)
      .flatMap(slotViewModel => slotViewModel.teamKeys)
  );

  readonly standingsTitle = computed(() =>
    this.liveMatchResults().length > 0 ? 'League table (live)' : 'League table'
  );

  readonly standings = computed<StandingsRow[]>(() =>
    computeStandings([...this.todaysCompletedMatches(), ...this.liveMatchResults()])
  );

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
