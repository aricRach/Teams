import {Component, input} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';

export interface InnerTab {
  title: string;
  link: string;
  tooltip: string;
  isDisabled: boolean;
}
@Component({
  selector: 'app-inner-tabs',
  imports: [
    RouterLinkActive,
    MatTooltip,
    RouterLink
  ],
  templateUrl: './inner-tabs.component.html',
  standalone: true,
  styleUrl: './inner-tabs.component.scss'
})
export class InnerTabsComponent {
  tabs = input<InnerTab[]>();
}
