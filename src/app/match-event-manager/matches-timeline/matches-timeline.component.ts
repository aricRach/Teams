import { Component, inject } from '@angular/core';
import { GameSlotPanelComponent } from '../../game/shared/game-slot-panel.component';
import {MatchTimelineService} from '../services/match-timeline.service';
import {DataLayoutComponent} from '../../shared/layouts/data-layout/data-layout.component';
import {DateFilterComponent} from '../../shared/date-filter/date-filter.component';

@Component({
  selector: 'app-matches-timeline',
  standalone: true,
  imports: [GameSlotPanelComponent, DateFilterComponent, DataLayoutComponent],
  providers: [MatchTimelineService],
  templateUrl: './matches-timeline.component.html',
  styleUrl: './matches-timeline.component.scss',
})
export class MatchesTimelineComponent {
  matchTimelineService = inject(MatchTimelineService);
}
