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

  readonly rows = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    const dayMatches = this.leagueMatches().filter(
      m => formatDateToString(new Date(m.createdAt.seconds * 1000)) === date
    );
    return computeStandings(dayMatches);
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
