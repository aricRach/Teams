import { Directive, ElementRef, EventEmitter, HostListener, input, output, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appDoubleClick]'
})
export class DoubleClickDirective {
  data = input.required<{ player: any; team: string }>();
  doubleClickDisabled = input();
  doubleClicked = output<{ position: { pageX: number, pageY: number }; player: any; team: string }>();

  private lastTapTime = 0;
  private doubleClickThreshold = 300; // Max time between taps (ms)
  private lastTapPos = { pageX: 0, pageY: 0 };
  private moveThreshold = 30; // **🔹 Fixed: Prevents single tap misfires**

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none'); // Prevents text selection
  }

  // ✅ **For Desktop:** Use native `dblclick`
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    if (this.doubleClickDisabled()) return;

    event.preventDefault();
    this.doubleClicked.emit({
      player: this.data().player,
      team: this.data().team,
      position: { pageX: event.pageX, pageY: event.pageY }
    });
  }

  // ✅ **For Mobile:** Custom double-tap detection
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (this.doubleClickDisabled()) return;

    const touch = event.changedTouches[0]; // Get the correct tap position
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    // ✅ **🔹 Improved: Prevents accidental single tap misfires**
    if (
      timeSinceLastTap < this.doubleClickThreshold &&
      Math.abs(touch.pageX - this.lastTapPos.pageX) < this.moveThreshold &&
      Math.abs(touch.pageY - this.lastTapPos.pageY) < this.moveThreshold
    ) {
      // ✅ **Valid double tap detected**
      this.doubleClicked.emit({
        player: this.data().player,
        team: this.data().team,
        position: { pageX: this.lastTapPos.pageX, pageY: this.lastTapPos.pageY }
      });

      // Reset to prevent triple taps
      this.lastTapTime = 0;
    } else {
      // First tap: Store time and position
      this.lastTapTime = now;
      this.lastTapPos = { pageX: touch.pageX, pageY: touch.pageY };
    }
  }
}
