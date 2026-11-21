import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { TEAM_COLOR_PALETTE } from '../../utils/team-label.util';
import { dropdownPositionForAnchor, ViewportPosition } from '../../utils/viewport-position.util';

@Component({
  selector: 'app-team-color-picker',
  standalone: true,
  imports: [],
  templateUrl: './team-color-picker.component.html',
  styleUrl: './team-color-picker.component.scss'
})
export class TeamColorPickerComponent {
  private el = inject(ElementRef);

  color = input<string | undefined>();
  takenColors = input<string[]>([]);
  colorChange = output<string>();

  readonly colorPalette = TEAM_COLOR_PALETTE;
  open = signal(false);
  // Approximate rendered size (3 columns x 4 rows of swatches + Clear), used to keep it on screen.
  private static readonly DROPDOWN_SIZE = { width: 180, height: 280 };
  // Fixed (viewport) position, so the team card's `overflow: hidden` can't cut the dropdown.
  dropdownPosition = signal<ViewportPosition>({ top: 0, left: 0 });

  toggleOpen(): void {
    const opening = !this.open();
    if (opening) {
      const rect = (this.el.nativeElement as HTMLElement).getBoundingClientRect();
      this.dropdownPosition.set(dropdownPositionForAnchor(rect, TeamColorPickerComponent.DROPDOWN_SIZE));
    }
    this.open.set(opening);
  }

  // A fixed dropdown doesn't follow its swatch, so close it when the page moves.
  @HostListener('window:scroll')
  @HostListener('window:resize')
  closeOnViewportChange(): void {
    if (this.open()) this.open.set(false);
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
