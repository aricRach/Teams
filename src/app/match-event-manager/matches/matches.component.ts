import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InnerTabsComponent, InnerTab } from '../../shared/inner-tabs/inner-tabs.component';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterOutlet, InnerTabsComponent],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss',
})
export class MatchesComponent {
  readonly innerTabs: InnerTab[] = [
    {
      link: 'timeline',
      title: 'Timeline',
      tooltip: '',
      isDisabled: false,
    },
    {
      link: 'manage-events',
      title: 'Manage Events',
      tooltip: '',
      isDisabled: false,
    },
  ];
}
