import {computed, inject, Injectable} from '@angular/core';
import {ManagePlayersService} from './manage-players.service';
import {FormGroup} from '@angular/forms';
import {convertFormValuesToNumbers} from '../../utils/form-utils';
import {DynamicComponentsTypes, FormField, genericValidators, PopupsService, subInputType} from 'ui';
import {PlayersService} from '../../players/players.service';
import {Auth} from '@angular/fire/auth';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';
import {AllMatchDataService} from '../../match-event-manager/services/all-match-data.service';
import {MatchEventsApiService} from '../../match-event-manager/services/match-events-api.service';
import {Statistics} from '../../players/models/player.model';
import {SpinnerService} from '../../spinner.service';

@Injectable()
export class EditPlayerStatisticsService {

  managePlayersService = inject(ManagePlayersService);
  playersService = inject(PlayersService);
  private auth = inject(Auth);
  private computedStatsService = inject(ComputedStatisticsService);
  private allMatchDataService = inject(AllMatchDataService);
  private matchEventsApiService = inject(MatchEventsApiService);
  private popupsService = inject(PopupsService);
  private spinnerService = inject(SpinnerService);

  lastDayPlayedStatistics = computed(() => {
    return this.managePlayersService.selectedPlayer() ? this.getLastDayStatistics(this.managePlayersService.selectedPlayer()) : null;
  })
  editStatisticsFormTitle = computed(() => {
    return this.lastDayPlayedStatistics()?.date ? `Edit ${this.lastDayPlayedStatistics()?.date} (last) statistics` : 'Edit last statistics'
  })
  gameControls = computed<FormField[]>(() => this.buildEditGameStatsFields())

  showForm = computed(() => {
    const controls = this.gameControls();
    return controls && controls.length > 0
  })

  getLastDayStatistics(playerData: any): any {
    if (!playerData?.id) return null;

    const playerDateMap = this.computedStatsService.statsForPlayer(playerData.id);
    const dates = Array.from(playerDateMap.keys());

    if (dates.length === 0) return null;

    const lastDate = dates.reduce((latest, current) =>
      new Date(current.split('-').reverse().join('-')) > new Date(latest.split('-').reverse().join('-'))
        ? current : latest
    );

    return {
      date: lastDate,
      statistics: playerDateMap.get(lastDate)!,
    };
  }

  async editLastStatistics(lastStatisticsForm: FormGroup<any>): Promise<void> {
    const formValues = convertFormValuesToNumbers(lastStatisticsForm.getRawValue());
    const player = this.managePlayersService.selectedPlayer();
    const lastDay = this.lastDayPlayedStatistics();
    if (!lastDay || !player?.id) return;

    const groupId = this.playersService.selectedGroup()?.id;
    if (!groupId) return;

    const currentStats: Statistics = lastDay.statistics || {goals: 0, wins: 0, loses: 0, draws: 0, games: 0, goalsConceded: 0};
    const delta: Partial<Statistics> = {};
    for (const key of ['goals', 'wins', 'loses', 'draws', 'games', 'goalsConceded'] as (keyof Statistics)[]) {
      const d = (formValues[key] || 0) - (currentStats[key] || 0);
      if (d !== 0) (delta as any)[key] = d;
    }

    if (Object.keys(delta).length === 0) return;

    const createdBy = this.auth.currentUser?.email || '';
    const matchId = await this.allMatchDataService.getOrCreateCorrectionMatch(groupId, lastDay.date, createdBy);

    this.spinnerService.setIsLoading(true);
    try {
      await this.matchEventsApiService.addEvent(groupId, matchId, {
        type: 'stat_correction',
        source: 'manual',
        createdBy,
        payload: {playerId: player.id, delta, dateKey: lastDay.date}
      });
      this.popupsService.addSuccessPopOut('Statistic updated successfully');
    } catch (e) {
      this.popupsService.addErrorPopOut('Cant save - please try again later');
    } finally {
      this.spinnerService.setIsLoading(false);
    }

  }

  private buildEditGameStatsFields() {
    const lastDay = this.lastDayPlayedStatistics();
    if (this.managePlayersService.selectedPlayer() && !lastDay) {
      return [];
    }
    const statistic = lastDay?.statistics;
    return [
      {
        alias: 'games:',
        name: 'games',
        value: statistic?.games,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'goals:',
        name: 'goals',
        value: statistic?.goals,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'wins:',
        name: 'wins',
        value: statistic?.wins,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'draws:',
        name: 'draws',
        value: statistic?.draws,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'loses:',
        name: 'loses',
        value: statistic?.loses,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'goals conceded:',
        name: 'goalsConceded',
        value: statistic?.goalsConceded,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
    ]
  }

}
