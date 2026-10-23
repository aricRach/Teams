import { Component, inject } from '@angular/core';
import { LeagueStandingsComponent } from '../../game/league-standings/league-standings.component';
import { LeagueTableService } from './league-table.service';
import {DataLayoutComponent} from '../../shared/layouts/data-layout/data-layout.component';
import { DateFilterComponent } from '../../shared/date-filter/date-filter.component';

@Component({
  selector: 'app-league-table',
  standalone: true,
  imports: [LeagueStandingsComponent, DateFilterComponent, DataLayoutComponent],
  providers: [LeagueTableService],
  templateUrl: './league-table.component.html',
  styleUrl: './league-table.component.scss'
})
export class LeagueTableComponent {
  league = inject(LeagueTableService);
}
