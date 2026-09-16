import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { AllMatchDataService } from '../services/all-match-data.service';
import { PlayersService } from '../../players/players.service';
import { computeStandings } from '../../game/league-standings/standings.util';
import { compareDates, compareDateWithToday, formatDateToString } from '../../utils/date-utils';
import { MatchRecord } from '../models/match-event.model';

@Injectable()
export class LeagueTableService {
  private allMatchData = inject(AllMatchDataService);
  private playersService = inject(PlayersService);

  private leagueMatches = computed<MatchRecord[]>(() =>
    this.allMatchData.matchesWithEvents()
      .map(x => x.match)
      .filter(m => m.mode === 'league' && m.status === 'completed' && m.createdAt?.seconds)
  );

  readonly availableDates = computed<string[]>(() => {
    const dates = new Set<string>();
    for (const m of this.leagueMatches()) {
      dates.add(formatDateToString(new Date(m.createdAt.seconds * 1000)));
    }
    return [...dates].sort(compareDates).reverse();
  });

  readonly selectedDate = signal<string>('');

  private dayMatches = computed<MatchRecord[]>(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.leagueMatches().filter(
      m => formatDateToString(new Date(m.createdAt.seconds * 1000)) === date
    );
  });

  readonly rows = computed(() => computeStandings(this.dayMatches()));

  /** Aliases as they were when the selected date's matches were played, not today's live aliases,
   *  so a later rename doesn't repaint history. Today is the exception: it reads the live alias
   *  directly, since there's no later match left to snapshot a same-day rename into. */
  readonly dateAliases = computed<Record<string, string>>(() => {
    if (compareDateWithToday(this.selectedDate()) === 0) {
      return this.playersService.teamAliases();
    }
    const matches = [...this.dayMatches()].sort(
      (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
    );
    const result: Record<string, string> = {};
    for (const m of matches) {
      if (!m.teamAliasSnapshot) continue;
      for (const teamKey of [m.winner, m.loser]) {
        if (!teamKey) continue;
        const alias = m.teamAliasSnapshot[teamKey];
        if (alias) result[teamKey] = alias; else delete result[teamKey];
      }
    }
    return result;
  });

  /** colors for the most recent day with games, so an older day's table renders without color.*/
  readonly dateColors = computed<Record<string, string>>(() => {
    const [latestDate] = this.availableDates();
    return this.selectedDate() === latestDate ? this.playersService.teamColors() : {};
  });

  constructor() {
    effect(() => {
      const dates = this.availableDates();
      if (dates.length && !dates.includes(this.selectedDate())) {
        this.selectedDate.set(dates[0]);
      }
    });
  }

  onDateChange(event: Event): void {
    this.selectedDate.set((event.target as HTMLSelectElement).value);
  }
}
