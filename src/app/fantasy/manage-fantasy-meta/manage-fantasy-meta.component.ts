import {Component, inject} from '@angular/core';
import {GenericFormComponent} from 'ui';
import {ManageFantasyMetaService} from '../services/manage-fantasy-meta.service';

@Component({
  selector: 'app-manage-fantasy-meta',
  imports: [GenericFormComponent],
  providers: [ManageFantasyMetaService],
  templateUrl: './manage-fantasy-meta.component.html',
  styleUrl: './manage-fantasy-meta.component.scss'
})
export class ManageFantasyMetaComponent {
  manageFantasyMetaService = inject(ManageFantasyMetaService);
}
