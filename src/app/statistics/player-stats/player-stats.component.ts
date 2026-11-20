import {Component, inject} from '@angular/core';
import {BaseChartDirective, provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {AutoCompleteComponent} from 'ui';
import {DataLayoutComponent} from '../../shared/layouts/data-layout/data-layout.component';
import {PlayerStatsService} from './player-stats.service';

@Component({
  selector: 'app-player-stats',
  imports: [BaseChartDirective, DataLayoutComponent, AutoCompleteComponent],
  providers: [PlayerStatsService, provideCharts(withDefaultRegisterables())],
  templateUrl: './player-stats.component.html',
  styleUrl: './player-stats.component.scss'
})
export class PlayerStatsComponent {
  protected playerStatsService = inject(PlayerStatsService);
}
