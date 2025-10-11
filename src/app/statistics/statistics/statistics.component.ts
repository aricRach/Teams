import {Component, inject} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {StatisticsService} from '../services/statistics.service';
import {MatTooltip} from '@angular/material/tooltip';


@Component({
  selector: 'app-statistics',
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    MatTooltip,
  ],
  templateUrl: './statistics.component.html',
  standalone: true,
  styleUrl: './statistics.component.scss',
  providers: [StatisticsService]
})
export class StatisticsComponent {
  statisticsService = inject(StatisticsService);
}
