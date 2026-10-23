import {Component, input} from '@angular/core';

@Component({
  selector: 'app-board-layout',
  templateUrl: './board-layout.component.html',
  styleUrl: './board-layout.component.scss',
})
export class BoardLayoutComponent {
  // Not named `title`: a static `title="..."` attribute would also become a native tooltip on the whole page.
  readonly heading = input<string>();
}
