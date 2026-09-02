import {computed, inject, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {Router} from '@angular/router';
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
        title: 'Team Of The Week',
        tooltip: '',
        isDisabled: false,
      },
      {
        link: 'edit-statistics',
        title: 'Edit Statistics',
        tooltip: this.adminControl.getAdminControl().showProtectedPages ? '' : 'In order to see this page enable \'show protected pages\' in admin control',
        isDisabled: !this.adminControl.getAdminControl().showProtectedPages
      }
    ]
  })
  playersService = inject(PlayersService);
  adminControl = inject(AdminControlService);
  router = inject(Router);

  setSelectedDate(event: Event) {
    const date = (event.target as HTMLSelectElement).value;
    this.selectedDate.set(date);
  }

  refreshTable() {
    this.selectedDate.set(this.selectAllLabel());
    this.router.navigate(['home', 'statistics', 'table']);
  }

  isAdmin() {
    return this.playersService.isAdmin();
  }

}
