import {Directive, ElementRef, EventEmitter, HostListener, input, output, Renderer2} from '@angular/core';

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

  @HostListener('mouseup')
  @HostListener('mouseleave')
  @HostListener('touchend')
  @HostListener('touchcancel')
  onMouseDown(event: MouseEvent): void {
    event.preventDefault(); // Prevents text selection
  }


  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if(this.doubleClickDisabled()) {
      return
    }
    this.clickCount++;

    if (this.clickCount === 1) {
      this.clickTimeout = setTimeout(() => {
        this.clickCount = 0;
      }, this.doubleClickDelay); // clear count when time passed
    } else if (this.clickCount === 2) { // Double click detected
      clearTimeout(this.clickTimeout);
      this.doubleClicked.emit({
        player: this.data().player,
        team: this.data().team,
        position: { pageX: event.pageX, pageY: event.pageY }
      });
      this.clickCount = 0;
    }
  }
}
