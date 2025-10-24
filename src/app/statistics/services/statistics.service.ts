import {computed, inject, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {Router} from '@angular/router';
import {AdminControlService} from '../../user/admin-control.service';

export class StatisticsService {

  selectAllLabel = signal('Select All');
   private selectedDate = signal(this.selectAllLabel());
  allUniqueDates = signal([] as string[]);

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

  constructor() {
    this.getAllStatisticsDateOptions();
  }

  getAllStatisticsDateOptions() {
    this.allUniqueDates.set(
      [this.selectAllLabel(), ...Array.from(new Set(
        this.playersService.flattenPlayers()
          .flatMap(player =>
            Object.entries(player.statistics) // Convert to array of [date, stats]
              .filter(([_, stats]) => stats.games > 0) // Keep only dates where games > 0
              .map(([date, _]) => date) // Extract only the date
          ).sort((d1, d2) =>
          d1.split('-').reverse().join('')!.localeCompare(d2.split('-').reverse().join(''))
        )
      ))]
    );
  }

  setSelectedDate(event: Event) {
    const date = (event.target as HTMLSelectElement).value;
    this.selectedDate.set(date);
  }

   deleteAllDayStatistics() {
   return this.playersService.deleteDayStatistics(this.selectedDate()).then(() => {
     this.playersService.getPlayersFromDB().subscribe(() => {
       this.selectedDate.set(this.selectAllLabel());
       this.getAllStatisticsDateOptions();
       this.router.navigate(['home','statistics', 'table']);
     })
   })
  }

  isAdmin() {
    return this.playersService.isAdmin();
  }

}
