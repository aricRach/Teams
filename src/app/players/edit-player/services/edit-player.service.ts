import {computed, inject, linkedSignal} from '@angular/core';
import {PlayersService} from '../../players.service';
import {DynamicComponentsTypes, FormField, genericValidators, ModalsService, subInputType} from 'ui';
import {FormGroup, Validators} from '@angular/forms';
import {convertFormValuesToNumbers} from '../../../utils/form-utils';
import {TeamOfTheWeekApiService} from '../../../team-of-the-week/services/team-of-the-week-api.service';

export class EditPlayerService {

  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);
  teamOfTheWeekApiService = inject(TeamOfTheWeekApiService);

  selectedPlayerOption = '';

  // linked signal - *computed* when allPlayersArray changed allow to load the newest player details.
  // initial value is null.
  // *able to change*.
  selectedPlayer = linkedSignal<any>(() => {
    return this.allPlayersArray().filter((p => p.name === this.selectedPlayerOption))[0] || null;
  });

  allPlayersArray = computed(() => {
    return [...this.playersService.flattenPlayers(this.playersService.computedTeams())]
  });

  // @ts-ignore
  controls = computed<FormField[]>(() => this.buildEditPlayerDetailsFields());
  gameControls = computed<FormField[]>(() => this.buildEditGameStatsFields())
  lastDayPlayedStatistics = computed(() => {
    return this.selectedPlayer() ? this.getLastDayStatistics(this.selectedPlayer()) : null;
  })
  editStatisticsFormTitle = computed(() => {
    return this.lastDayPlayedStatistics()?.date ? `Edit ${this.lastDayPlayedStatistics()?.date} (last) statistics` : 'Edit last statistics'
  })
  shouldDisabledFields = computed(() => !this.selectedPlayer())

  onChangePlayer() {
    this.selectedPlayer.set(this.allPlayersArray().filter((p => p.name === this.selectedPlayerOption))[0]);
  }

  editPlayer(playerDetails: FormGroup<any>) {
    const details = playerDetails.getRawValue();
    details.rating = Number(details.rating)
    this.playersService.updatePlayer(this.selectedPlayer(), {...this.selectedPlayer(), ...details}, false).then()
  }

  deletePlayer() {
    this.modalsService.openConfirmModal({
      description: `Are you sure you want to delete ${this.selectedPlayer().name}?`,
    }).afterClosed().subscribe((result) => {
      if(result) {
        this.playersService.setPlayerActiveStatus(this.selectedPlayer(), false).then(() => this.selectedPlayer.set(null))
      }
    });
  }

  private buildEditGameStatsFields() {
    const dayData = this.selectedPlayer()?.statistics[this.lastDayPlayedStatistics()['date']];
    return [
      {
        alias: 'games:',
        name: 'games',
        value: dayData?.games,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'goals:',
        name: 'goals',
        value: dayData?.goals,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'wins:',
        name: 'wins',
        value: dayData?.wins,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'draws:',
        name: 'draws',
        value: dayData?.draws,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'loses:',
        name: 'loses',
        value: dayData?.loses,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'goals conceded:',
        name: 'goalsConceded',
        value: dayData?.goalsConceded,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
    ]
  }


  private buildEditPlayerDetailsFields() {
    return [
      {
        alias: 'name:',
        name: 'name',
        disabled: true,
        value: this.selectedPlayer()?.name,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        validators: {},
      },
      {
        alias: 'rating:',
        name: 'rating',
        disabled: this.shouldDisabledFields(),
        value: this.selectedPlayer()?.rating,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'email:',
        name: 'email',
        disabled: this.shouldDisabledFields(),
        value: this.selectedPlayer()?.email,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        validators: {
          email: {
            validatorFn: Validators.email,
            errorMsg: 'Must be a valid email address',
          }
        }
      }
    ]
  }

  editLastStatistics(lastStatisticsForm: FormGroup<any>) {
    const formValues = lastStatisticsForm.getRawValue();
    const updatedPlayer = this.selectedPlayer();
    updatedPlayer.statistics[this.lastDayPlayedStatistics().date] = convertFormValuesToNumbers(formValues);
    this.playersService.updatePlayer(this.selectedPlayer(), updatedPlayer, true).then(() => {
      this.teamOfTheWeekApiService.markTotwDateNotUpdated(this.lastDayPlayedStatistics().date).then()
    });
  }

  getLastDayStatistics(playerData: any): any {
    if (!playerData || !playerData.statistics) {
      throw new Error("Invalid player data");
    }

    const statistics = playerData.statistics;
    const dates = Object.keys(statistics);

    if (dates.length === 0) {
      throw new Error("No statistics available");
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
}
