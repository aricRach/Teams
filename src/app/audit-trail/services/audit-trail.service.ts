import {computed, inject, Injectable, signal} from '@angular/core';
import {UserService} from '../../user/user.service';
import {currentDate, currentDateTime} from '../../utils/date-utils';
import {PlayersService} from '../../players/players.service';

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
  playersService = inject(PlayersService);
  localStorageAuditKey = computed(() => `teams-audit-${this.playersService.selectedGroup().id}`)
  auditTrail = computed(() => {
    if(this.userActions().length === 0) {
      const savedAudit = localStorage.getItem(this.localStorageAuditKey());
      if(savedAudit) {
        const auditTrail = JSON.parse(savedAudit) as UserAction[];
        if(auditTrail && auditTrail[0].date.includes(currentDate)) {
          return auditTrail;
        }
      }
    }
    return this.userActions();
  })

  addAuditTrail(actionDetails: string) {
    const userActions = [...this.auditTrail()];
    userActions.unshift({actionDetails: actionDetails, date: currentDateTime(), user: this.userService.user().displayName});
    this.userActions.set(userActions);
    localStorage.setItem(`teams-audit-${this.playersService.selectedGroup().id}`, JSON.stringify(this.userActions()));

  }
}
