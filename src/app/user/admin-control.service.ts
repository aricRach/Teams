import {Injectable, signal} from '@angular/core';

export interface AdminControl {
  showAddPlayerForm: boolean;
  showRating: boolean;
  showProtectedPages: boolean;
  showSaveButtons: boolean;
  showMakeBalanceTeams: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class AdminControlService {

  adminControl = signal<AdminControl>({} as AdminControl);

  setAdminControl(adminControl: any) {
    this.adminControl.update((adminControlState) => {
      return {...adminControlState, ...adminControl};
    })
  }
}
