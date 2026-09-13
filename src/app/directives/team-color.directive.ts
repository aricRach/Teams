import { Directive, effect, ElementRef, input, Renderer2, RendererStyleFlags2 } from '@angular/core';

/** Applies a team's color as a `--team-color` CSS custom property on the host,
 *  toggling a `has-team-color` class so the consumer's own stylesheet can render
 *  a swatch (e.g. a `::before` dot) only when a color is actually set. */
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
        // Custom properties must go through `setProperty` (the DashCase flag routes
        // Renderer2 there) - a plain `el.style['--team-color'] = value` assignment
        // (what Renderer2.setStyle does without this flag) is not reliably honored
        // by browsers for `--`-prefixed names, silently leaving the var unset.
        this.renderer.setStyle(this.el.nativeElement, '--team-color', color, RendererStyleFlags2.DashCase);
        this.renderer.addClass(this.el.nativeElement, 'has-team-color');
      } else {
        this.renderer.removeStyle(this.el.nativeElement, '--team-color', RendererStyleFlags2.DashCase);
        this.renderer.removeClass(this.el.nativeElement, 'has-team-color');
      }
    });
  }
}
