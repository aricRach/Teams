import {computed, inject} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {DynamicComponentsTypes, FormField, genericValidators, ModalsService, subInputType} from 'ui';
import {FormGroup, Validators} from '@angular/forms';
import {ManagePlayersService} from './manage-players.service';

export class EditPlayerService {

  playersService = inject(PlayersService);
  managePlayersService = inject(ManagePlayersService);

  // @ts-ignore
  controls = computed<FormField[]>(() => this.buildEditPlayerDetailsFields());
  shouldDisabledFields = computed(() => !this.managePlayersService.selectedPlayer())

  editPlayer(playerDetails: FormGroup<any>) {
    const details = playerDetails.getRawValue();
    details.rating = Number(details.rating);
    this.playersService.updatePlayerDetails(this.managePlayersService.selectedPlayer(), {...this.managePlayersService.selectedPlayer(), ...details}).then()
  }

  private buildEditPlayerDetailsFields() {
    return [
      {
        alias: 'name:',
        name: 'name',
        disabled: this.shouldDisabledFields(),
        value: this.managePlayersService.selectedPlayer()?.name,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        validators: genericValidators.required,
      },
      {
        alias: 'rating:',
        name: 'rating',
        disabled: this.shouldDisabledFields(),
        value: this.managePlayersService.selectedPlayer()?.rating,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        subInputType: subInputType.NUMBER,
        validators: {...genericValidators.required, ...genericValidators.positiveNumber},
      },
      {
        alias: 'email:',
        name: 'email',
        disabled: this.shouldDisabledFields(),
        value: this.managePlayersService.selectedPlayer()?.email,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        validators: {
          email: {
            validatorFn: Validators.email,
            errorMsg: 'Must be a valid email address',
          }
        }
      },
      {
        alias: 'Is guest:',
        name: 'isGuest',
        disabled: this.shouldDisabledFields(),
        value: this.managePlayersService.selectedPlayer()?.isGuest || false,
        dynamicComponent: DynamicComponentsTypes.CHECKBOX,
        validators: {},
      },
    ]
  }
}
