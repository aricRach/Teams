import {computed, inject, linkedSignal, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {NavigationEnd, Router} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map} from 'rxjs';
import {ComputedStatisticsService} from './computed-statistics.service';

export class StatisticsService {

  selectAllLabel = signal('Select All');
  private computedStatsService = inject(ComputedStatisticsService);

  allUniqueDates = computed(() =>
    [this.selectAllLabel(), ...this.computedStatsService.allDatesWithActivity()]
  );

  /** Falls back to "Select All" when the picked date no longer has games (e.g. after all data was deleted). */
  private selectedDate = linkedSignal<string[], string>({
    source: this.allUniqueDates,
    computation: (dates, previous) =>
      previous && dates.includes(previous.value) ? previous.value : this.selectAllLabel(),
  });

  getSelectedDate = computed(() => this.selectedDate());

  noDateSelected = computed(() => this.selectedDate() === this.selectAllLabel());

  isLoading = this.computedStatsService.isLoading;
  hasError = this.computedStatsService.hasError;

  innerTabs = computed(() => {
    return [
      {
        link: 'table',
        title: 'Table',
        tooltip: '',
        isDisabled: false,
      },
      {
        link: 'team-of-the-week',
        title: 'Team of the week',
        tooltip: '',
        isDisabled: false,
      },
      {
        link: 'players',
        title: 'Players',
        tooltip: '',
        isDisabled: false,
      },
      {
        link: 'leaders',
        title: 'Leaders',
        tooltip: '',
        isDisabled: false,
      },
    ]
  })
  playersService = inject(PlayersService);
  router = inject(Router);

  showGuests = signal(true);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    {initialValue: this.router.url}
  );

  isTableTabActive = computed(() => this.currentUrl().includes('/statistics/table'));

  /** Players and Leaders have their own range picker instead of the date filter. */
  showDateFilter = computed(() =>
    !this.currentUrl().includes('/statistics/players') && !this.currentUrl().includes('/statistics/leaders')
  );

  setShowGuests(event: Event) {
    this.showGuests.set((event.target as HTMLInputElement).checked);
  }

  setSelectedDate(date: string) {
    this.selectedDate.set(date);
  }

  reloadStatistics() {
    this.computedStatsService.reload();
  }

  isAdmin() {
    return this.playersService.isAdmin();
  }

}
