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
  const isInProgress = navigationService.isLocked();
  const isFormDirty = isGenericForm && component.genericForm.form()?.dirty && !component.genericForm.isSubmitted();
  if (isInProgress || isFormDirty) {
    // Locked navigation means something is running on the page (a live game, a draft session).
    const dialog = isInProgress
      ? {
          title: 'Leave this page?',
          description: "Something is still running here, like a live game or a draft. If you leave, this page loses track of it.",
          confirmBtn: 'leave page',
          danger: true,
        }
      : {
          title: 'Discard your changes?',
          description: "You haven't saved this form. If you leave, your changes are lost.",
          confirmBtn: 'discard changes',
          danger: true,
        };
    return modalsService.openConfirmModal(dialog).afterClosed().pipe(map((result: string) => {
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
