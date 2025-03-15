import {Injectable, signal} from '@angular/core';

export interface AdminControl {
  isAdminMode: boolean
}
@Injectable({
  providedIn: 'root'
})
export class AdminControlService {

  adminControl = signal<AdminControl>({isAdminMode: false});

  setAdminControl(adminControl: AdminControl) {
    this.adminControl.update((adminControlState) => {
      adminControlState.isAdminMode = adminControl.isAdminMode;
      return adminControlState;
    })
  }

  setIsAdmin(isAdminc: boolean) {
    this.adminControl.set({isAdminMode: isAdminc});
  }

  constructor() { }
}
