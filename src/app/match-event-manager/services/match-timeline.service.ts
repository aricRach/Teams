import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {MatchEventRecord, MatchRecord} from '../models/match-event.model';
import {PlayersService} from '../../players/players.service';
import {MatchEventsApiService} from './match-events-api.service';
import {rxResource} from '@angular/core/rxjs-interop';
import {forkJoin, map, of, take} from 'rxjs';
import {formatDateToString} from '../../utils/date-utils';
import {PanelScorer} from '../../game/shared/game-slot-panel.component';

export interface MatchPanelData {
  slot: number;
  teamKeys: string[];
  score: Record<string, number>;
  scorers: PanelScorer[];
  squad: Record<string, string[]>;
  aliases: Record<string, string>;
}

@Injectable()
export class MatchTimelineService {

  playersService = inject(PlayersService);
  private matchEventsApi = inject(MatchEventsApiService);

  // ── Derived group id ────────────────────────────────────────────────────────
  groupId = computed(() => this.playersService.selectedGroup()?.id);

  // ── Player ID → Name lookup ─────────────────────────────────────────────────
  private playerNameMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    this.playersService.flattenPlayers(false, true).forEach((p) => {
      if (p.id) map.set(p.id, p.name);
    });
    return map;
  });

  // ── 5. Structure Match Panels Data ──────────────────────────────────────────
  matchPanelsData = computed<MatchPanelData[]>(() => {
    const matches = [...this.matchesForSelectedDate()].sort(
      (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
    );
    const eventsMap = this.eventsResource.value() || {};
    const nameMap = this.playerNameMap();

    const resolveNames = (ids?: string[]): string[] =>
      (ids || []).map((id) => nameMap.get(id) ?? id);

    return matches.map((match: MatchRecord, index: number): MatchPanelData => {
      const events =
        (eventsMap as Record<string, MatchEventRecord[]>)[match.id!] || [];

      const teamKeys = [match.winner, match.loser].filter((k): k is string => !!k);

      const scorers: PanelScorer[] = events
        .filter((e) => e.type === 'player_goal' && !e.deletedAt)
        .map((e) => ({ name: e.playerNameSnapshot ?? 'Goal', minute: e.minute, teamKey: e.teamKey }))
        .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

      const score: Record<string, number> = {};
      if (match.winner) score[match.winner] = match.wonTeamScore || 0;
      if (match.loser) score[match.loser] = match.loseTeamScore || 0;

      const squad: Record<string, string[]> = {};
      if (match.winner) squad[match.winner] = resolveNames(match.winnerPlayerIds);
      if (match.loser) squad[match.loser] = resolveNames(match.loserPlayerIds);

      return {
        slot: index + 1,
        teamKeys,
        score,
        scorers,
        squad,
        aliases: match.teamAliasSnapshot || {},
      };
    });
  });

  selectedDate = signal<string>('');

  constructor() {
    // Auto-select the first available date
    effect(() => {
      const dates = this.availableDates();
      if (dates.length > 0 && !this.selectedDate()) {
        this.selectedDate.set(dates[0]);
      }
    });
  }
  // ── 1. Load Match Headers ───────────────────────────────────────────────────
  matchesResource = rxResource({
    params: () => ({ groupId: this.groupId() }),
    stream: ({ params }) => {
      if (!params.groupId) return of([]);
      return this.matchEventsApi.getMatches(params.groupId);
    },
  });

  // ── 2. Extract Available Dates ──────────────────────────────────────────────
  availableDates = computed<string[]>(() => {
    const dates = new Set<string>();
    this.completedMatches().forEach((match: MatchRecord) => {
      if (match.createdAt?.seconds) {
        dates.add(formatDateToString(new Date(match.createdAt.seconds * 1000)));
      }
    });
    return Array.from(dates);
  });

  // ── 3. Current Selected Matches ─────────────────────────────────────────────
  matchesForSelectedDate = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.completedMatches().filter((m: MatchRecord) => {
      if (!m.createdAt?.seconds) return false;
      return formatDateToString(new Date(m.createdAt.seconds * 1000)) === date;
    });
  });

  completedMatches = computed(() => {
    return ((this.matchesResource.value() as MatchRecord[]) || []).filter(
      (m: MatchRecord) => m.status === 'completed'
    );
  });

  // ── 4. Load Events for Selected Matches ────────────────────────────────────
  eventsResource = rxResource({
    params: () => ({
      groupId: this.groupId(),
      matchIds: this.matchesForSelectedDate().map((m) => m.id!),
    }),
    stream: ({ params }) => {
      if (!params.groupId || !params.matchIds.length) return of({});

      const observables = params.matchIds.map((id: string) =>
        this.matchEventsApi.getEvents(params.groupId!, id).pipe(
          take(1),
          map((events) => ({ id, events }))
        )
      );

      return forkJoin(observables).pipe(
        map((results) => {
          const eventsMap: Record<string, MatchEventRecord[]> = {};
          results.forEach((res) => {
            eventsMap[res.id] = res.events;
          });
          return eventsMap;
        })
      );
    },
  });


  onDateChange(event: Event) {
    this.selectedDate.set((event.target as HTMLSelectElement).value);
  }

}
