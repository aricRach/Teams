import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {StatisticsService} from '../services/statistics.service';
import {InnerTabsComponent} from '../../shared/inner-tabs/inner-tabs.component';

@Component({
  selector: 'app-statistics',
  imports: [
    RouterOutlet,
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
