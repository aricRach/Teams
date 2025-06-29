import {Component, inject} from '@angular/core';
import {EditStatisticsService} from '../services/edit-statistics.service';
import {GenericFormComponent} from 'ui';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-edit-statistics',
  imports: [ GenericFormComponent, FormsModule],
  templateUrl: './edit-statistics.component.html',
  styleUrl: './edit-statistics.component.scss'
})
export class EditStatisticsComponent {

  editStatisticsService = inject(EditStatisticsService);
}
