import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameSlotPanelComponent } from '../../game/shared/game-slot-panel.component';
import {MatchTimelineService} from '../services/match-timeline.service';

@Component({
  selector: 'app-matches-timeline',
  standalone: true,
  imports: [GameSlotPanelComponent, FormsModule],
  providers: [MatchTimelineService],
  templateUrl: './matches-timeline.component.html',
  styleUrl: './matches-timeline.component.scss',
})
export class MatchesTimelineComponent {
  matchTimelineService = inject(MatchTimelineService);
}
