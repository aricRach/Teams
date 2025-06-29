import {computed, inject, Injectable} from '@angular/core';
import {ManagePlayersService} from './manage-players.service';
import {FormGroup} from '@angular/forms';
import {convertFormValuesToNumbers} from '../../utils/form-utils';
import {DynamicComponentsTypes, FormField, genericValidators, subInputType} from 'ui';
import {PlayersService} from '../../players/players.service';
import {TeamOfTheWeekApiService} from '../../team-of-the-week/services/team-of-the-week-api.service';

@Injectable({
  providedIn: 'root'
})
export class EditStatisticsService {

  managePlayersService = inject(ManagePlayersService);
  playersService = inject(PlayersService);
  teamOfTheWeekApiService = inject(TeamOfTheWeekApiService);

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
    if (!playerData || !playerData.statistics) {
      throw new Error("Invalid player data");
    }

    const statistics = playerData.statistics;
    const dates = Object.keys(statistics);

    if (dates.length === 0) {
      return null
    }

    // Find the latest date
    const lastDate = dates.reduce((latest, current) => {
      return new Date(current.split("-").reverse().join("-")) > new Date(latest.split("-").reverse().join("-"))
        ? current
        : latest;
    });

    return {
      date: lastDate,
      statistics: statistics[lastDate],
    };
  }

  editLastStatistics(lastStatisticsForm: FormGroup<any>) {
    const formValues = lastStatisticsForm.getRawValue();
    const updatedPlayer = this.managePlayersService.selectedPlayer();
    updatedPlayer.statistics[this.lastDayPlayedStatistics().date] = convertFormValuesToNumbers(formValues);
    this.playersService.updatePlayer(this.managePlayersService.selectedPlayer(), updatedPlayer, true).then(() => {
      this.teamOfTheWeekApiService.markTotwDateNotUpdated(this.lastDayPlayedStatistics().date).then()
    });
  }

  private buildEditGameStatsFields() {
    if(this.managePlayersService.selectedPlayer() && !this.lastDayPlayedStatistics()) {
      return [];
    }
    const statistic = this.managePlayersService.selectedPlayer()?.statistics[this.lastDayPlayedStatistics()['date']];
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
