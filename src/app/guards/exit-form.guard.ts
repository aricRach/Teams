import {CanDeactivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {ModalsService} from 'ui';
import {catchError, map, of} from 'rxjs';
import {Location} from '@angular/common';

export const exitFormGuard: CanDeactivateFn<unknown> = (component: any) => {
  const modalsService = inject(ModalsService);
  const location = inject(Location);
  const router = inject(Router);
  const isGenericForm = !!component.genericForm;
  if (isGenericForm && component.genericForm.form()?.dirty && !component.genericForm.isSubmitted()
      || component.form?.dirty
  ) {
    return modalsService.openConfirmModal({
      confirmBtn: 'exit page',
      description: 'the changes will not be saved'
    }).afterClosed().pipe(map((result: string) => {
      if(result) {
        return true;
      }
        location.go(router.url); // restores URL, removes back multiple times
        return false;
    }),
      catchError(() => of(true)))
  }
  return true;
};
