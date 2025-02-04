import { Component, signal } from '@angular/core';
import {GridComponent} from '../../../../ui-elements/dist/ui';

@Component({
  selector: 'app-statistics',
  imports: [
    GridComponent
  ],
  templateUrl: './statistics.component.html',
  standalone: true,
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent {

  columns = [
    {
      alias: 'name',
      property: 'name',
      isFilterDisabled: false,
      isSortDisabled: false
    },
    {
      alias: 'goals',
      property: 'goals',
      isFilterDisabled: false,
      isSortDisabled: false
    }
  ]
  dataRows = []
  actions = []
  config = {
    numberOfColumns: 2
  }
}
