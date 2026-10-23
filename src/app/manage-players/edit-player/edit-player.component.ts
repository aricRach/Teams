import {Component, inject, ViewChild} from '@angular/core';
import { GenericFormComponent,} from 'ui';
import {FormsModule} from '@angular/forms';
import {EditPlayerService} from '../services/edit-player.service';
import {FormLayoutComponent} from '../../shared/layouts/form-layout/form-layout.component';

@Component({
  selector: 'app-edit-player',
  imports: [GenericFormComponent, FormsModule, FormLayoutComponent],
  providers: [EditPlayerService],
  templateUrl: './edit-player.component.html',
  standalone: true,
  styleUrl: './edit-player.component.scss'
})
export class EditPlayerComponent {
  editPlayerService = inject(EditPlayerService);

  @ViewChild(GenericFormComponent) genericForm!: GenericFormComponent;
}
