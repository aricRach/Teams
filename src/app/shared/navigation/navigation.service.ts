import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private locked = signal(false);

  private beforeUnloadListener = (event: BeforeUnloadEvent) => {
    event.preventDefault();
  };

  lockNavigation() {
    this.locked.set(true);
    window.addEventListener('beforeunload', this.beforeUnloadListener);
  }

  unlockNavigation() {
    this.locked.set(false);
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
  }

  isLocked() {
    return this.locked()
  }
}
