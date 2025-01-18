import {Directive, EventEmitter, HostListener, input, Output} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appLongPress]'
})
export class LongPressDirective {

  @Output() longPress = new EventEmitter<{mouseEvent: MouseEvent, player: any, team: string}>();
  private timeout: any;
  data = input<any>();

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.timeout = setTimeout(() => {
      this.longPress.emit({mouseEvent: event, player: this.data().player, team: this.data().team});
    }, 5000); // Long press duration in ms
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  onMouseUp(): void {
    clearTimeout(this.timeout);
  }
  constructor() { }

}
