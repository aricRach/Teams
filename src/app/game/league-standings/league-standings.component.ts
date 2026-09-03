import { Component, input } from '@angular/core';
import { StandingsRow } from './standings.util';

@Component({
  selector: 'app-league-standings',
  standalone: true,
  templateUrl: './league-standings.component.html',
  styleUrl: './league-standings.component.scss'
})
export class LeagueStandingsComponent {
  rows = input<StandingsRow[]>([]);
  title = input<string>('League table');

  teamLabel(teamKey: string): string {
    return teamKey.replace(/^team/i, '').toUpperCase() || teamKey;
  }
}
