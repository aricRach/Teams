import {CanDeactivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {ModalsService} from 'ui';
import {Location} from '@angular/common';
import {catchError, map, of} from 'rxjs';
import {FantasyDraftComponent} from '../fantasy-draft/fantasy-draft.component';

export const exitFantasyDraftGuard: CanDeactivateFn<any> = (component: FantasyDraftComponent) => {
  const modalsService = inject(ModalsService);
  const location = inject(Location);
  const router = inject(Router);
  if(!component.fantasyDraftService.isDraftDirty()) {
    return true;
  }
    return modalsService.openConfirmModal({
      title: 'Are you sure?',
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
};
