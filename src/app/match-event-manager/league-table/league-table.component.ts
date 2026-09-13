import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeagueStandingsComponent } from '../../game/league-standings/league-standings.component';
import { LeagueTableService } from './league-table.service';

@Component({
  selector: 'app-league-table',
  standalone: true,
  imports: [FormsModule, LeagueStandingsComponent],
  providers: [LeagueTableService],
  templateUrl: './league-table.component.html',
  styleUrl: './league-table.component.scss'
})
export class LeagueTableComponent {
  league = inject(LeagueTableService);
}
