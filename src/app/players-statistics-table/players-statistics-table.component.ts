import {Component, inject} from '@angular/core';
import {PlayersStatisticsTableService} from './services/players-statistics-table.service';
import {GridComponent} from 'ui';

@Component({
  selector: 'app-players-statistics-table',
  imports: [GridComponent],
  templateUrl: './players-statistics-table.component.html',
  styleUrl: './players-statistics-table.component.scss',
  providers: [PlayersStatisticsTableService]
})
export class PlayersStatisticsTableComponent {

  playersStatisticsTableService=inject(PlayersStatisticsTableService);


}
