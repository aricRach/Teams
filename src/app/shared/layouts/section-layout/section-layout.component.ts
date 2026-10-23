import {Component, input} from '@angular/core';
import {InnerTab, InnerTabsComponent} from '../../inner-tabs/inner-tabs.component';

@Component({
  selector: 'app-section-layout',
  imports: [InnerTabsComponent],
  templateUrl: './section-layout.component.html',
  styleUrl: './section-layout.component.scss',
})
export class SectionLayoutComponent {
  // Not named `title`: a static `title="..."` attribute would also become a native tooltip on the whole page.
  readonly heading = input<string>();
  readonly tabs = input<InnerTab[]>([]);
}
