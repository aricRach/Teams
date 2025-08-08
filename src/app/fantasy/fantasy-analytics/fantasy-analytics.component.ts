import {Component, inject} from '@angular/core';
import {FantasyAnalyticsService} from '../services/fantasy-analytics.service';
import {JsonPipe} from '@angular/common';
import {GridComponent} from 'ui';

@Component({
  selector: 'app-fantasy-analytics',
  imports: [JsonPipe, GridComponent],
  providers: [FantasyAnalyticsService],
  templateUrl: './fantasy-analytics.component.html',
  styleUrl: './fantasy-analytics.component.scss'
})
export class FantasyAnalyticsComponent {

  fantasyAnalyticsService = inject(FantasyAnalyticsService);
}
