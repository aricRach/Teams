import {Component, inject} from '@angular/core';
import {EditStatisticsService} from '../services/edit-statistics.service';
import {JsonPipe, KeyValuePipe} from '@angular/common';
import {PlayersDragDropTableComponent} from '../../players/players-drag-drop-table/players-drag-drop-table.component';

@Component({
  selector: 'app-edit-statistics',
  imports: [KeyValuePipe, JsonPipe, PlayersDragDropTableComponent],
  providers: [EditStatisticsService],
  templateUrl: './edit-statistics.component.html',
  styleUrl: './edit-statistics.component.scss'
})
export class EditStatisticsComponent {

  editStatisticsService = inject(EditStatisticsService);

}
