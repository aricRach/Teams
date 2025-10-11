import {CanDeactivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {ModalsService} from 'ui';
import {catchError, map, of} from 'rxjs';
import {Location} from '@angular/common';
import {NavigationService} from '../shared/navigation/navigation.service';

export const exitFormGuard: CanDeactivateFn<unknown> = (component: any) => {
  const modalsService = inject(ModalsService);
  const location = inject(Location);
  const router = inject(Router);
  const navigationService = inject(NavigationService);
  const isGenericForm = !!component.genericForm;
  if ( navigationService.isLocked() ||
    (isGenericForm && component.genericForm.form()?.dirty && !component.genericForm.isSubmitted())
      // || (component.form?.dirty && navigationService.isLocked())
    // || (typeof component.form === 'function' && component.form()?.dirty && navigationService.isLocked())
  ) {
    return modalsService.openConfirmModal({
      title: 'Are you sure?',
      confirmBtn: 'exit page',
      description: 'the changes will not be saved'
    }).afterClosed().pipe(map((result: string) => {
      if(result) {
        navigationService.unlockNavigation();
        return true;
      }
        location.go(router.url); // restores URL, removes back multiple times
        return false;
    }),
      catchError(() => {
        navigationService.unlockNavigation();
        return of(true);
      }))
  }
  return true;
};
