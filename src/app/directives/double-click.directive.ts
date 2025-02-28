import { Directive, ElementRef, EventEmitter, HostListener, input, output, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appDoubleClick]'
})
export class DoubleClickDirective {
  data = input.required<{ player: any; team: string }>();
  doubleClickDisabled = input();
  doubleClicked = output<{ position: { pageX: number, pageY: number }; player: any; team: string }>();

  private lastClickTime = 0;
  private doubleClickThreshold = 300; // Time in ms to detect double click
  private lastTapEvent: MouseEvent | Touch | null = null; // Store last event to track position

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
  }

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  preventSelection(event: MouseEvent | TouchEvent): void {
    event.preventDefault(); // Prevents long-press selection issues
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0]; // Get the final touch position
    this.detectDoubleClick(touch);
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.detectDoubleClick(event);
  }

  private detectDoubleClick(event: MouseEvent | Touch): void {
    if (this.doubleClickDisabled()) {
      return;
    }

    const now = Date.now();
    const timeSinceLastClick = now - this.lastClickTime;

    if (timeSinceLastClick < this.doubleClickThreshold && this.lastTapEvent) {
      // A valid double-click detected
      this.doubleClicked.emit({
        player: this.data().player,
        team: this.data().team,
        position: {
          pageX: this.lastTapEvent.pageX || this.lastTapEvent.clientX,
          pageY: this.lastTapEvent.pageY || this.lastTapEvent.clientY
        }
      });
      this.lastClickTime = 0; // Reset time tracking
      this.lastTapEvent = null; // Clear event
    } else {
      // First tap: store time and event, but don't trigger anything yet
      this.lastClickTime = now;
      this.lastTapEvent = event;
    }
  }
}
