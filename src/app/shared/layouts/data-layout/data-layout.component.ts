import {Component, input, output} from '@angular/core';
import {StateMessageComponent} from '../../state-message/state-message.component';

@Component({
  selector: 'app-data-layout',
  imports: [StateMessageComponent],
  templateUrl: './data-layout.component.html',
  styleUrl: './data-layout.component.scss',
})
export class DataLayoutComponent {
  // Not named `title`: a static `title="..."` attribute would also become a native tooltip on the whole page.
  readonly heading = input<string>();

  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly errorHeading = input<string>();
  readonly emptyHeading = input<string>();
  readonly emptyDetail = input<string>();
  readonly retry = output<void>();
}
