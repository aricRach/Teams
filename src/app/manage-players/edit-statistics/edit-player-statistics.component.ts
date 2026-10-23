import {Component, inject, ViewChild} from '@angular/core';
import {FormLayoutComponent} from '../../shared/layouts/form-layout/form-layout.component';
import {EditPlayerStatisticsService} from '../services/edit-player-statistics.service';
import {GenericFormComponent} from 'ui';
import {FormsModule} from '@angular/forms';
import {StateMessageComponent} from '../../shared/state-message/state-message.component';

@Component({
  selector: 'app-edit-player-statistics',
  imports: [GenericFormComponent, FormsModule, FormLayoutComponent, StateMessageComponent],
  providers: [EditPlayerStatisticsService],
  templateUrl: './edit-player-statistics.component.html',
  styleUrl: './edit-player-statistics.component.scss'
})
export class EditPlayerStatisticsComponent {
  editStatisticsService = inject(EditPlayerStatisticsService);

  @ViewChild(GenericFormComponent) genericForm!: GenericFormComponent;
}
