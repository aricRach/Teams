import {Component, inject} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {StatisticsService} from '../services/statistics.service';
import {MatTooltip} from '@angular/material/tooltip';
import {InnerTabsComponent} from '../../shared/inner-tabs/inner-tabs.component';


@Component({
  selector: 'app-statistics',
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    MatTooltip,
    InnerTabsComponent
  ],
  templateUrl: './statistics.component.html',
  standalone: true,
  styleUrl: './statistics.component.scss',
  providers: [StatisticsService]
})
export class StatisticsComponent {
  statisticsService = inject(StatisticsService);
}
