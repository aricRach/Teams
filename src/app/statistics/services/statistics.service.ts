import {computed, inject, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {NavigationEnd, Router} from '@angular/router';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map} from 'rxjs';
import {AdminControlService} from '../../user/admin-control.service';
import {ComputedStatisticsService} from './computed-statistics.service';

export class StatisticsService {

  selectAllLabel = signal('Select All');
  private selectedDate = signal(this.selectAllLabel());
  private computedStatsService = inject(ComputedStatisticsService);

  allUniqueDates = computed(() =>
    [this.selectAllLabel(), ...this.computedStatsService.allDatesWithActivity()]
  );

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
        link: 'edit-statistics',
        title: 'Edit statistics',
        tooltip: this.adminControl.getAdminControl().showProtectedPages ? '' : 'In order to see this page enable \'show protected pages\' in admin control',
        isDisabled: !this.adminControl.getAdminControl().showProtectedPages
      }
    ]
  })
  playersService = inject(PlayersService);
  adminControl = inject(AdminControlService);
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

  setShowGuests(event: Event) {
    this.showGuests.set((event.target as HTMLInputElement).checked);
  }

  setSelectedDate(date: string) {
    this.selectedDate.set(date);
  }

  reloadStatistics() {
    this.computedStatsService.reload();
  }

  refreshTable() {
    this.selectedDate.set(this.selectAllLabel());
    this.router.navigate(['home', 'statistics', 'table']);
  }

  isAdmin() {
    return this.playersService.isAdmin();
  }

}
