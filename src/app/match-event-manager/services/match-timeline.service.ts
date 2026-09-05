import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {MatchEventRecord, MatchRecord} from '../models/match-event.model';
import {PlayersService} from '../../players/players.service';
import {MatchEventsApiService} from './match-events-api.service';
import {rxResource} from '@angular/core/rxjs-interop';
import {forkJoin, map, of, take} from 'rxjs';
import {formatDateToString} from '../../utils/date-utils';
import {formatTeamLabel} from '../../utils/team-label.util';

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

  // ── 5. Structure FlipCards Data ─────────────────────────────────────────────
  flipCardsData = computed(() => {
    const matches = [...this.matchesForSelectedDate()].sort(
      (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
    );
    const eventsMap = this.eventsResource.value() || {};
    const nameMap = this.playerNameMap();

    const resolveNames = (ids?: string[]): string =>
      (ids || []).map((id) => nameMap.get(id) ?? id).join(', ');

    return matches.map((match: MatchRecord, index: number) => {
      const events =
        (eventsMap as Record<string, MatchEventRecord[]>)[match.id!] || [];
      const goals = events.filter(
        (e: MatchEventRecord) => e.type === 'player_goal' && !e.deletedAt
      );

      const winnerName = match.winner
        ? formatTeamLabel(match.winner, match.teamAliasSnapshot?.[match.winner])
        : 'Team A';
      const loserName = match.loser
        ? formatTeamLabel(match.loser, match.teamAliasSnapshot?.[match.loser])
        : 'Team B';
      const isDraw = match.gameStatus === 'draw';
      const winnerScore = match.wonTeamScore || 0;
      const loserScore = match.loseTeamScore || 0;

      const winnerPlayers = resolveNames(match.winnerPlayerIds);
      const loserPlayers = resolveNames(match.loserPlayerIds);

      // Front card: result row + one row per team with their player names
      const result = isDraw
        ? `Match ${index + 1} · Draw (${winnerScore} - ${loserScore})`
        : `Match ${index + 1} · ${winnerName} won (${winnerScore} - ${loserScore})`;

      const frontContent: Record<string, string> = {
        '': result,
        [winnerName]: winnerPlayers || '—',
        [loserName]: loserPlayers || '—',
      };

      goals.sort(
        (a, b) => (a.payload?.['timerMs'] || 0) - (b.payload?.['timerMs'] || 0)
      );

      const formatMs = (ms: number) => {
        if (!ms) return '00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${m}:${s}`;
      };

      const data: Record<string, string> = {};
      if(goals.length > 0) {
        goals.forEach((g, i) => {
          const key = `${i + 1}# ${g.playerNameSnapshot}`;
          data[key] = formatMs(g.payload?.['timerMs'] || 0);
        });
      } else {
        data['No Goals'] = 'No Goals'
      }


      return { frontContent, data };
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
