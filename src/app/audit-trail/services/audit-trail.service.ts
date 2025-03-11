import {inject, Injectable, signal} from '@angular/core';
import {UserService} from '../../user/user.service';
import {currentDateTime} from '../../utils/date-utils';

export interface UserAction {
  date: string,
  user: string,
  actionDetails: string,
}
@Injectable({
  providedIn: 'root'
})
export class AuditTrailService {

  userActions = signal<UserAction[]>([]);
  userService = inject(UserService);

  constructor() { }

  addAuditTrail(actionDetails: string) {
    this.userActions.update((userActions: UserAction[]) => {
       userActions.unshift({actionDetails: actionDetails, date: currentDateTime(), user: this.userService.user().displayName});
      console.log(userActions)
      return userActions;
    })
  }

  getAuditTrail() {
    return [...this.userActions()];
  }
}
