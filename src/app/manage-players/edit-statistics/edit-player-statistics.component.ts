import {Component, inject} from '@angular/core';
import {EditPlayerStatisticsService} from '../services/edit-player-statistics.service';
import {GenericFormComponent} from 'ui';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-edit-player-statistics',
  imports: [ GenericFormComponent, FormsModule],
  templateUrl: './edit-player-statistics.component.html',
  styleUrl: './edit-player-statistics.component.scss'
})
export class EditPlayerStatisticsComponent {

  editStatisticsService = inject(EditPlayerStatisticsService);
}
