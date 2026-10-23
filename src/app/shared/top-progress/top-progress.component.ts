import {Component, input} from '@angular/core';

@Component({
  selector: 'app-top-progress',
  template: `
    @if (active()) {
      <div class="top-progress" role="progressbar" aria-label="Loading">
        <div class="top-progress-bar"></div>
      </div>
    }
  `,
  styleUrl: './top-progress.component.scss',
})
export class TopProgressComponent {
  readonly active = input(false);
}
