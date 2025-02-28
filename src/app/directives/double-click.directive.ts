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
  private doubleClickThreshold = 300; // Time threshold for double click (in ms)

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
  }

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event'])
  onTouchOrClick(event: MouseEvent | TouchEvent): void {
    event.preventDefault(); // Prevents selection & long-press issues
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

    if (timeSinceLastClick < this.doubleClickThreshold) {
      // A valid double click detected
      this.doubleClicked.emit({
        player: this.data().player,
        team: this.data().team,
        position: {
          pageX: event.pageX || event.clientX, // Fallback if needed
          pageY: event.pageY || event.clientY
        }
      });
      this.lastClickTime = 0; // Reset
    } else {
      // Not a double click, update timestamp
      this.lastClickTime = now;
    }
  }
}
