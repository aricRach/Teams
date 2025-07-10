import {computed, Injectable, signal} from '@angular/core';

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

  private adminControl = signal<AdminControl>({} as AdminControl);

  getAdminControl = computed(() => this.adminControl());

  setAdminControl(adminControl: any) {
    this.adminControl.update((adminControlState) => {
      return {...adminControlState, ...adminControl};
    })
  }

  cleanAdminControlState() {
    this.adminControl.set({} as AdminControl);
  }
}
