import {Component, input} from '@angular/core';

@Component({
  selector: 'app-form-layout',
  templateUrl: './form-layout.component.html',
  styleUrl: './form-layout.component.scss',
})
export class FormLayoutComponent {
  // Not named `title`: a static `title="..."` attribute would also become a native tooltip on the whole page.
  readonly heading = input<string>();
}
