import {Component, inject} from '@angular/core';
import {BoardLayoutComponent} from '../../shared/layouts/board-layout/board-layout.component';
import {EditStatisticsService} from '../services/edit-statistics.service';
import {PlayersDragDropTableComponent} from '../../players/players-drag-drop-table/players-drag-drop-table.component';
import {StateMessageComponent} from '../../shared/state-message/state-message.component';

@Component({
  selector: 'app-edit-statistics',
  imports: [PlayersDragDropTableComponent, BoardLayoutComponent, StateMessageComponent],
  providers: [EditStatisticsService],
  templateUrl: './edit-statistics.component.html',
  styleUrl: './edit-statistics.component.scss'
})
export class EditStatisticsComponent {

  editStatisticsService = inject(EditStatisticsService);


}
