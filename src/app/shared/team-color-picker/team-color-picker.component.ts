import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { TEAM_COLOR_PALETTE } from '../../utils/team-label.util';

/**
 * A swatch button that opens a small palette dropdown to pick (or clear) a
 * team's color. Purely presentational - the parent owns the actual color map
 * and decides which colors are already taken by other teams.
 */
@Component({
  selector: 'app-team-color-picker',
  standalone: true,
  imports: [],
  templateUrl: './team-color-picker.component.html',
  styleUrl: './team-color-picker.component.scss'
})
export class TeamColorPickerComponent {
  private el = inject(ElementRef);

  /** This team's current color, or empty/undefined when none is set. */
  color = input<string | undefined>();
  /** Colors already used by other teams - rendered disabled so two teams can never collide. */
  takenColors = input<string[]>([]);
  colorChange = output<string>();

  readonly colorPalette = TEAM_COLOR_PALETTE;
  open = signal(false);

  toggleOpen(): void {
    this.open.update(o => !o);
  }

  isTaken(hex: string): boolean {
    return this.color() !== hex && this.takenColors().includes(hex);
  }

  select(hex: string): void {
    if (this.isTaken(hex)) return;
    this.colorChange.emit(this.color() === hex ? '' : hex);
    this.open.set(false);
  }

  clear(): void {
    this.colorChange.emit('');
    this.open.set(false);
  }

  // Own host element, so no CSS-selector guessing is needed to tell "inside this
  // picker" from "inside some other team's picker" - just check containment directly.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
