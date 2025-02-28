import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  private isLoading = signal(false);

  setIsLoading(isLoading: boolean) {
    this.isLoading.set(isLoading);
  }
  getIsLoading() {
    return this.isLoading;
  }

  constructor() { }
}
