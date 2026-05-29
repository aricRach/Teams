import {inject, linkedSignal} from '@angular/core';
import {StatisticsService} from './statistics.service';
import {PlayersService} from '../../players/players.service';
import {ModalsService, PopupsService} from 'ui';
import {Player, Statistics, TeamsOptions} from '../../players/models/player.model';
import {SpinnerService} from '../../spinner.service';
import {Auth} from '@angular/fire/auth';
import {AllMatchDataService} from '../../match-event-manager/services/all-match-data.service';
import {MatchEventsApiService} from '../../match-event-manager/services/match-events-api.service';
import {ComputedStatisticsService} from './computed-statistics.service';

export class EditStatisticsService {

  statisticsService = inject(StatisticsService);
  spinnerService = inject(SpinnerService);
  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);
  popupsService = inject(PopupsService);
  private auth = inject(Auth);
  private allMatchDataService = inject(AllMatchDataService);
  private matchEventsApiService = inject(MatchEventsApiService);
  computedStatsService = inject(ComputedStatisticsService);

  teams = linkedSignal(() => this.playersService.getTeams())

  async deleteDayStatistics() {
    this.popupsService.addErrorPopOut('Deleting a day is not supported. Edit match events directly.');
  }

  async updateTeamStatistics(editTeamEvent: { players: Player[], team: TeamsOptions, name: string; number: number }): Promise<void> {
    this.modalsService.openConfirmModal({
      title: `Edit ${editTeamEvent.team} ${editTeamEvent.name}`,
      height: 400,
      description: `Are you sure you want to perform this action?<br>All the team players will be affected.<br>${editTeamEvent.players.map(p => `<b>${p.name}</b>`).join('<br>')}`
    }).afterClosed().subscribe(async (res) => {
      if (res) {
        const statKey = editTeamEvent.name as keyof Statistics;
        const selectedDate = this.statisticsService.getSelectedDate();
        const groupId = this.playersService.selectedGroup().id;
        const createdBy = this.auth.currentUser?.email || '';

        this.spinnerService.setIsLoading(true);
        try {
          const matchId = await this.allMatchDataService.getOrCreateCorrectionMatch(groupId, selectedDate, createdBy);
          await Promise.all(editTeamEvent.players.map(player =>
            this.matchEventsApiService.addEvent(groupId, matchId, {
              type: 'stat_correction',
              source: 'manual',
              createdBy,
              payload: {playerId: player.id, delta: {[statKey]: editTeamEvent.number}, dateKey: selectedDate}
            })
          ));
          this.popupsService.addSuccessPopOut(`${editTeamEvent.team} was updated successfully.`);
        } finally {
          this.spinnerService.setIsLoading(false);
        }
      }
    });
  }
}
