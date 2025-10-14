import {computed, inject} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {DynamicComponentsTypes, FormField, genericValidators, ModalsService, subInputType} from 'ui';
import {FormGroup, Validators} from '@angular/forms';
import {ManagePlayersService} from './manage-players.service';

export class EditPlayerService {

  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);
  managePlayersService = inject(ManagePlayersService);

  // @ts-ignore
  controls = computed<FormField[]>(() => this.buildEditPlayerDetailsFields());
  shouldDisabledFields = computed(() => !this.managePlayersService.selectedPlayer())
  selectedPlayer = computed(() => this.managePlayersService.selectedPlayer());

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
        value: this.selectedPlayer()?.name,
        dynamicComponent: DynamicComponentsTypes.INPUT,
        validators: genericValidators.required,
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
      },
      {
        alias: 'Is guest:',
        name: 'isGuest',
        disabled: this.shouldDisabledFields(),
        value: this.selectedPlayer()?.isGuest || false,
        dynamicComponent: DynamicComponentsTypes.CHECKBOX,
        validators: {},
      },
    ]
  }

  deletePlayer() {
    this.modalsService.openConfirmModal({
      description: `Are you sure you want to delete ${this.selectedPlayer().name}?`,
    }).afterClosed().subscribe((result) => {
      if(result) {
        this.playersService.setPlayerActiveStatus(this.selectedPlayer(), false).then(() => this.managePlayersService.removeSelectedPlayer())
      }
    });
  }
}
