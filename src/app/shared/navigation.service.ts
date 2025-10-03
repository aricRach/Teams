import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private locked = signal(false);

  lockNavigation() {
    this.locked.set(true);
  }
  unlockNavigation() {
    this.locked.set(false);
  }

  isLocked() {
    return this.locked()
  }
}
