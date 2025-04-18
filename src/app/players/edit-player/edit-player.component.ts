import {Component, computed, inject, signal} from '@angular/core';
import {PlayersService} from '../players.service';
import {
  DynamicComponentsTypes,
  FormField,
  GenericFormComponent,
  genericValidators,
  subInputType,
  ModalsService
} from 'ui';
import {FormGroup, FormsModule} from '@angular/forms';
import {convertFormValuesToNumbers} from '../../utils/form-utils';
import {TeamOfTheWeekApiService} from '../../team-of-the-week/services/team-of-the-week-api.service';

@Component({
  selector: 'app-edit-player',
  imports: [
    GenericFormComponent,
    FormsModule],
  templateUrl: './edit-player.component.html',
  standalone: true,
  styleUrl: './edit-player.component.scss'
})
export class EditPlayerComponent {

  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);
  teamOfTheWeekApiService = inject(TeamOfTheWeekApiService);
  controls = computed<FormField[]>(() => this.buildEditPlayerDetailsFields());
  gameControls = computed<FormField[]>(() => this.buildEditGameStatsFields())
  allPlayersArray = computed(() => [...this.playersService.flattenPlayers()]);
  selectedPlayerOption = '';
  selectedPlayer = signal<any>(null);
  lastDayPlayedStatistics = computed(() => {
    return this.selectedPlayer() ? this.getLastDayStatistics(this.selectedPlayer()) : null;
  })
  editStatisticsFormTitle = computed(() => {
   return this.lastDayPlayedStatistics()?.date ? `Edit ${this.lastDayPlayedStatistics()?.date} (last) statistics` : 'Edit last statistics'
  })
  shouldDisabledFields = computed(() => !this.selectedPlayer())

  editPlayer(playerDetails: FormGroup<any>) {
    const details = playerDetails.getRawValue();
    details.rating = Number(details.rating)
    this.playersService.updatePlayer({...this.selectedPlayer(), ...details}, false).then()
  }

  onChangePlayer() {
    this.selectedPlayer.set(this.allPlayersArray().filter((p => p.name === this.selectedPlayerOption))[0]);
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
        alias: 'goals:',
        name: 'goals',
        value: dayData?.goals,
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
    ]
  }

  editLastStatistics(lastStatisticsForm: FormGroup<any>) {
    const formValues = lastStatisticsForm.getRawValue();
    const updatedPlayer = this.selectedPlayer();
    updatedPlayer.statistics[this.lastDayPlayedStatistics().date] = convertFormValuesToNumbers(formValues);
    this.playersService.updatePlayer(updatedPlayer, true).then(() => {
      this.teamOfTheWeekApiService.markTotwDateNotUpdated(this.lastDayPlayedStatistics().date).then()
    });
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
}
