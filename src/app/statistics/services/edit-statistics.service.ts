import {inject, linkedSignal} from '@angular/core';
import {StatisticsService} from './statistics.service';
import {PlayersService} from '../../players/players.service';
import {ModalsService, PopupsService} from 'ui';
import {Player, Statistics, TeamsOptions} from '../../players/models/player.model';
import {SpinnerService} from '../../spinner.service';
import {Auth} from '@angular/fire/auth';
import {AllMatchDataService} from '../../match-event-manager/services/all-match-data.service';
import {formatDateToString} from '../../utils/date-utils';
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

  async deleteDayStatistics(): Promise<void> {
    const selectedDate = this.statisticsService.getSelectedDate();
    this.modalsService.openConfirmModal({
      description: `Are you sure you want to <b>void</b> <b>${selectedDate}</b>?<br>Stats for this day will be removed. This can be undone.`
    }).afterClosed().subscribe(async (res) => {
      if (!res) return;
      const groupId = this.playersService.selectedGroup()?.id;
      if (!groupId) return;

      const matchIdsOnDate = this.allMatchDataService.relevantMatches()
        .filter(m => m.createdAt?.seconds && formatDateToString(new Date(m.createdAt.seconds * 1000)) === selectedDate)
        .map(m => m.id!);

      if (!matchIdsOnDate.length) {
        this.popupsService.addErrorPopOut('No matches found for this date.');
        return;
      }

      this.spinnerService.setIsLoading(true);
      try {
        await this.matchEventsApiService.updateMatches(groupId, matchIdsOnDate, {status: 'voided'});
        this.statisticsService.refreshTable();
        this.popupsService.addSuccessPopOut(`Statistics for ${selectedDate} have been voided.`);
      } catch {
        this.popupsService.addErrorPopOut('Failed to void statistics. Please try again.');
      } finally {
        this.spinnerService.setIsLoading(false);
      }
    });
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
          await this.matchEventsApiService.addEvents(groupId, matchId,
            editTeamEvent.players.map(player => ({
              type: 'stat_correction' as const,
              source: 'manual' as const,
              createdBy,
              payload: {playerId: player.id, delta: {[statKey]: editTeamEvent.number}, dateKey: selectedDate}
            }))
          );
          this.popupsService.addSuccessPopOut(`${editTeamEvent.team} was updated successfully.`);
        } finally {
          this.spinnerService.setIsLoading(false);
        }
      }
    });
  }
}
