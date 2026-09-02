import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlipCardComponent } from 'ui';
import {MatchTimelineService} from '../services/match-timeline.service';

@Component({
  selector: 'app-matches-timeline',
  standalone: true,
  imports: [FlipCardComponent, FormsModule],
  providers: [MatchTimelineService],
  templateUrl: './matches-timeline.component.html',
  styleUrl: './matches-timeline.component.scss',
})
export class MatchesTimelineComponent {
  matchTimelineService = inject(MatchTimelineService);

  frontStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, var(--card-gradient-start, #3a3f55), var(--card-gradient-end, #2c3144))',
    color: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    padding: '20px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  };

  backStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1aa9f1, #077dbb)',
    color: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    padding: '20px',
    textAlign: 'center',
    fontSize: '16px',
    lineHeight: '1.5',
  };
}
