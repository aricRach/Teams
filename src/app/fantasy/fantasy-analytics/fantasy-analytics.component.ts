import {Component, inject, input, OnInit} from '@angular/core';
import {FantasyAnalyticsService} from '../services/fantasy-analytics.service';
import {JsonPipe} from '@angular/common';
import {GridComponent} from 'ui';
import {FantasyData, FantasyMeta} from '../services/fantasy-api.service';
import {ActivatedRoute} from '@angular/router';
import {Player} from '../../players/models/player.model';

@Component({
  selector: 'app-fantasy-analytics',
  imports: [JsonPipe, GridComponent],
  providers: [FantasyAnalyticsService],
  templateUrl: './fantasy-analytics.component.html',
  styleUrl: './fantasy-analytics.component.scss'
})
export class FantasyAnalyticsComponent implements OnInit {

  fantasyAnalyticsService = inject(FantasyAnalyticsService);
  fantasyAllUsersPicks = input();
  inactivePlayers = input<Player[]>();

  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const allUsersPicks = this.fantasyAllUsersPicks();
    if(allUsersPicks) {
      this.fantasyAnalyticsService.setAllFantasyDates(allUsersPicks as FantasyData);
      this.fantasyAnalyticsService.allFantasyData.set(allUsersPicks as FantasyData);
    }
    const meta = this.route.parent?.snapshot.data['fantasyMeta'];
    if(meta) {
      this.fantasyAnalyticsService.setMetaData(meta as FantasyMeta);
    }
    if(this.inactivePlayers()) {
      this.fantasyAnalyticsService.inactivePlayers.set(this.inactivePlayers() as Player[])
    }
  }
}
