import {computed, inject, Injectable, signal} from '@angular/core';
import {DynamicComponentsTypes, genericValidators, PopupsService, subInputType} from 'ui';
import {FormGroup} from '@angular/forms';
import {ManageFantasyMetaApiService} from './manage-fantasy-meta-api.service';
import {PlayersService} from '../../players/players.service';
import {SpinnerService} from '../../spinner.service';
import {Router} from '@angular/router';

@Injectable()
export class ManageFantasyMetaService {

  manageFantasyMetaApiService = inject(ManageFantasyMetaApiService);
  playersService = inject(PlayersService);
  popupsService = inject(PopupsService);
  spinnerService = inject(SpinnerService);
  router = inject(Router);

  groupId = computed(() => this.playersService.selectedGroup().id);
  fantasyMetaFields = signal(
    [{
      alias: 'number of picks',
      name: 'numberOfPicks',
      dynamicComponent: DynamicComponentsTypes.INPUT,
      subInputType: subInputType.NUMBER,
      validators: {...genericValidators.positiveNumber, ...genericValidators.required}
    },
      {
        alias: 'nextDate',
        name: 'nextDate',
        dynamicComponent: DynamicComponentsTypes.DATE,
        subInputType: subInputType.DATE,
        validators: genericValidators.required
      }
    ]
  )

  submitFantasyMetaData(meta: FormGroup) {
    const numberOfPicks =Number(meta.value.numberOfPicks);
    const nextDate = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(meta.value.nextDate).replaceAll('/', '-');
    this.spinnerService.setIsLoading(true);
    this.manageFantasyMetaApiService.setFantasyMeta(this.groupId(), {numberOfPicks, nextDate}).then(() => {
      this.popupsService.addSuccessPopOut(`Fantasy draft settings for ${nextDate} was saved successfully`);
      this.router.navigate(['/home/fantasy'], {queryParams: { reload: Date.now() }}); // trigger resolver of meta again.
    })
      .catch(() => {
        this.popupsService.addErrorPopOut(`Cant save Fantasy draft settings for ${nextDate}, please try again later`);
      })
      .finally(() => {
        this.spinnerService.setIsLoading(false);
      })
  }
}
