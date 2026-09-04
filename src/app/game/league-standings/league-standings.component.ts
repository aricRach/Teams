import { Component, input } from '@angular/core';
import { StandingsRow } from './standings.util';
import { TeamLabelPipe } from '../../pipes/team-label.pipe';

@Component({
  selector: 'app-league-standings',
  standalone: true,
  imports: [TeamLabelPipe],
  templateUrl: './league-standings.component.html',
  styleUrl: './league-standings.component.scss'
})
export class LeagueStandingsComponent {
  rows = input<StandingsRow[]>([]);
  title = input<string>('League table');
  aliases = input<Record<string, string>>({});
}
