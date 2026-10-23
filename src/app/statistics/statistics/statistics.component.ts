import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {StatisticsService} from '../services/statistics.service';
import {SectionLayoutComponent} from '../../shared/layouts/section-layout/section-layout.component';
import {DateFilterComponent} from '../../shared/date-filter/date-filter.component';

@Component({
  selector: 'app-statistics',
  imports: [
    SectionLayoutComponent,
    RouterOutlet,
    DateFilterComponent
  ],
  templateUrl: './statistics.component.html',
  standalone: true,
  styleUrl: './statistics.component.scss',
  providers: [StatisticsService]
})
export class StatisticsComponent {
  statisticsService = inject(StatisticsService);
}
