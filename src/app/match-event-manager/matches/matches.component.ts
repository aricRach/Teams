import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlipCardComponent } from 'ui';
import { MatchesService } from '../services/matches.service';

@Component({
  selector: 'app-matches',
  standalone: true,
  providers: [MatchesService],
  imports: [FlipCardComponent, FormsModule],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss',
})
export class MatchesComponent {
  matchesService = inject(MatchesService);

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
