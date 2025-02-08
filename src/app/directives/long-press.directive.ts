import {Directive, EventEmitter, HostListener, input, output, Output} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appLongPress]'
})
export class LongPressDirective {
  data = input.required<{ player: any; team: string }>(); // Strongly typed input for player and team data
  longPress = output<{ position: {pageX: number, pageY: number}; player: any; team: string }>();

  private timeout: any;
  private isPressing = false;
  private pressDuration = 2000; // Long press duration in ms

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onPressStart(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    if (this.isPressing) return; // Prevent duplicate triggers
    this.isPressing = true;

    const { pageX, pageY } = this.getEventCoordinates(event);

    this.timeout = setTimeout(() => {
      this.longPress.emit({
        player: this.data().player,
        team: this.data().team,
        position: {
          pageX: pageX,
          pageY: pageY
        }
      });
      this.isPressing = false; // Reset pressing state after emitting
    }, this.pressDuration);
  }

  private getEventCoordinates(event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      return { pageX: event.pageX, pageY: event.pageY };
    } else {
      const touch = event.touches[0] || event.changedTouches[0];
      return { pageX: touch.pageX, pageY: touch.pageY };
    }
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
