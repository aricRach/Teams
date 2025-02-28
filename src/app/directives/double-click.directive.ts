import { Directive, ElementRef, EventEmitter, HostListener, input, output, Renderer2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appDoubleClick]'
})
export class DoubleClickDirective {
  data = input.required<{ player: any; team: string }>();
  doubleClickDisabled = input();
  doubleClicked = output<{ position: { pageX: number, pageY: number }; player: any; team: string }>();

  private clickTimeout: any;
  private clickCount = 0;
  private doubleClickDelay = 300;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'user-select', 'none');
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onClick(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();

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
      const { pageX, pageY } = this.getEventCoordinates(event);
      this.doubleClicked.emit({
        player: this.data().player,
        team: this.data().team,
        position: { pageX, pageY }
      });
      this.clickCount = 0;
    }
  }

  private getEventCoordinates(event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      return { pageX: event.pageX, pageY: event.pageY };
    } else {
      const touch = event.touches[0] || event.changedTouches[0];
      return { pageX: touch.pageX, pageY: touch.pageY };
    }
  }
}
