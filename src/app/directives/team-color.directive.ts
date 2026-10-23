import { Directive, effect, ElementRef, input, Renderer2, RendererStyleFlags2 } from '@angular/core';

@Directive({
  standalone: true,
  selector: '[appTeamColor]'
})
export class TeamColorDirective {
  appTeamColor = input<string | undefined | null>();

  constructor(private el: ElementRef, private renderer: Renderer2) {
    effect(() => {
      const color = this.appTeamColor();
      if (color) {
        // Without DashCase, Renderer2 assigns `--team-color` directly and browsers ignore it.
        this.renderer.setStyle(this.el.nativeElement, '--team-color', color, RendererStyleFlags2.DashCase);
        this.renderer.addClass(this.el.nativeElement, 'has-team-color');
      } else {
        this.renderer.removeStyle(this.el.nativeElement, '--team-color', RendererStyleFlags2.DashCase);
        this.renderer.removeClass(this.el.nativeElement, 'has-team-color');
      }
    });
  }
}
