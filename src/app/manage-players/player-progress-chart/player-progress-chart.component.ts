import {Component, HostListener, inject, ViewChild} from '@angular/core';
import {BaseChartDirective, provideCharts, withDefaultRegisterables} from 'ng2-charts';
import {PlayerProgressChartService} from '../services/player-progress-chart.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-player-progress-chart',
  imports: [BaseChartDirective, FormsModule],
  providers: [PlayerProgressChartService,
  provideCharts(withDefaultRegisterables())],
  templateUrl: './player-progress-chart.component.html',
  styleUrl: './player-progress-chart.component.scss'
})
export class PlayerProgressChartComponent {

  playerProgressChartService = inject(PlayerProgressChartService);

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @HostListener('window:resize')
  onResize() {
    this.chart?.update();
  }
}
