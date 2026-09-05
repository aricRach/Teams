import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AllMatchDataService } from '../services/all-match-data.service';
import { LeagueStandingsComponent } from '../../game/league-standings/league-standings.component';
import { computeStandings } from '../../game/league-standings/standings.util';
import { compareDates, formatDateToString } from '../../utils/date-utils';
import { MatchRecord } from '../models/match-event.model';

@Component({
  selector: 'app-league-table',
  standalone: true,
  imports: [FormsModule, LeagueStandingsComponent],
  templateUrl: './league-table.component.html',
  styleUrl: './league-table.component.scss'
})
export class LeagueTableComponent {
  private allMatchData = inject(AllMatchDataService);

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

  /** Aliases as they were when the selected date's matches were played, not today's aliases.
   *  A team with no snapshot (match predates this field) renders as its plain letter, not
   *  today's live alias — showing a rename that hadn't happened yet would be worse than no nickname.
   *  Matches are applied oldest-first, so a same-day rename between two matches settles on the
   *  name from the later match — the one that was true by the end of that day. */
  readonly dateAliases = computed<Record<string, string>>(() => {
    const matches = [...this.dayMatches()].sort(
      (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
    );
    const result: Record<string, string> = {};
    for (const m of matches) {
      if (!m.teamAliasSnapshot) continue;
      if (m.winner && m.teamAliasSnapshot[m.winner]) result[m.winner] = m.teamAliasSnapshot[m.winner];
      if (m.loser && m.teamAliasSnapshot[m.loser]) result[m.loser] = m.teamAliasSnapshot[m.loser];
    }
    return result;
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
