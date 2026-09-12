import { Component, input } from '@angular/core';
import { StandingsRow } from './standings.util';
import { defaultTeamLetter } from '../../utils/team-label.util';

@Component({
  selector: 'app-league-standings',
  standalone: true,
  imports: [],
  templateUrl: './league-standings.component.html',
  styleUrl: './league-standings.component.scss'
})
export class LeagueStandingsComponent {
  rows = input<StandingsRow[]>([]);
  title = input<string>('League table');
  aliases = input<Record<string, string>>({});

  /** Slot letter and nickname shown on separate lines so a long nickname
   *  truncates instead of forcing the table to scroll on small screens. */
  teamLetter(teamKey: string): string {
    return defaultTeamLetter(teamKey);
  }

  teamAlias(teamKey: string): string | undefined {
    return this.aliases()[teamKey]?.trim() || undefined;
  }
}
