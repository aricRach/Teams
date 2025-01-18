import {Directive, EventEmitter, HostListener, input, Output} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appLongPress]'
})
export class LongPressDirective {

  private timeout: any;
  private isPressing = false; // Tracks if the press is active
  private pressDuration = 2000; // Long press duration in ms

  @Output() longPress = new EventEmitter<{mouseEvent: MouseEvent, player: any, team: string}>();
  data = input<any>();
  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])

  onPressStart(event: MouseEvent | TouchEvent): void {
    if (this.isPressing) return; // Prevent duplicate triggers
    this.isPressing = true;

    this.timeout = setTimeout(() => {
      this.longPress.emit({
        // @ts-ignore
        mouseEvent: event,
        player: this.data()?.player,
        team: this.data()?.team
      });
      this.isPressing = false; // Reset pressing state after emitting
    }, this.pressDuration);
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  @HostListener('touchend')
  @HostListener('touchcancel')
  onPressEnd(): void {
    this.clearPress();
  }

  private clearPress(): void {
    this.isPressing = false;
    clearTimeout(this.timeout); // Cancel the timeout
  }
}
