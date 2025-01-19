import {Directive, EventEmitter, HostListener, input, output, Output} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appLongPress]'
})
export class LongPressDirective {
  data = input.required<{ player: any; team: string }>(); // Strongly typed input for player and team data
  longPress = output<{ mouseEvent: MouseEvent | TouchEvent; player: any; team: string }>();

  private timeout: any;
  private isPressing = false;
  private pressDuration = 2000; // Long press duration in ms

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPressStart(event: MouseEvent | TouchEvent): void {
    if (this.isPressing) return; // Prevent duplicate triggers
    this.isPressing = true;

    this.timeout = setTimeout(() => {
      this.longPress.emit({
        mouseEvent: event,
        player: this.data().player,
        team: this.data().team
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
