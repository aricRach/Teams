import {computed, Injectable, signal} from '@angular/core';

export interface AdminControl {
  showAddPlayerForm: boolean;
  showRating: boolean;
  showProtectedPages: boolean;
  showSaveButtons: boolean;
  showMakeBalanceTeams: boolean;
  hideGuests: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class AdminControlService {

  private adminControl = signal<AdminControl>({} as AdminControl);

  private toggleAll = signal(false);

  getAdminControl = computed(() => this.adminControl());
  isAdminModeEnabled = computed(() => Object.values(this.adminControl()).some(control => control))
  setAdminControl(adminControl: any) {
    this.adminControl.update((adminControlState) => {
      return {...adminControlState, ...adminControl};
    })
  }

  getToggleAll() {
    return this.toggleAll();
  }

  setToggleAll(toggle: boolean) {
    this.toggleAll.set(toggle);
  }

  cleanAdminControlState() {
    this.adminControl.set({} as AdminControl);
  }
}
