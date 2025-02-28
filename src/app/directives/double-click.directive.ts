import { Directive, ElementRef, EventEmitter, HostListener, input, output, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appDoubleClick]'
})
export class DoubleClickDirective {
  data = input.required<{ player: any; team: string }>();
  doubleClickDisabled = input();
  doubleClicked = output<{ position: { pageX: number; pageY: number }; player: any; team: string }>();

  private clickTimeout: any;
  private clickCount = 0;
  private doubleClickDelay = 300;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    event.preventDefault(); // Prevents selection & long-press issues
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    event.preventDefault(); // Prevents text selection
    this.handleClick(event);
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0]; // Get the final touch position
    this.handleClick(touch);
  }

  private handleClick(event: MouseEvent | Touch): void {
    if (this.doubleClickDisabled()) {
      return;
    }

    this.clickCount++;

    if (this.clickCount === 1) {
      this.clickTimeout = setTimeout(() => {
        this.clickCount = 0;
      }, this.doubleClickDelay);
    } else if (this.clickCount === 2) {
      clearTimeout(this.clickTimeout);

      // Ensure correct coordinates on mobile and desktop
      const position = {
        pageX: event.pageX || event.clientX, // Fallback if pageX is undefined
        pageY: event.pageY || event.clientY // Fallback if pageY is undefined
      };

      this.doubleClicked.emit({
        player: this.data().player,
        team: this.data().team,
        position
      });

      this.clickCount = 0;
    }
  }
}
