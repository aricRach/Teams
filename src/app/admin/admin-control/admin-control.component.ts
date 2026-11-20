import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import {AdminControlDialogService} from './admin-control-dialog.service';

@Component({
  selector: 'app-admin-control',
  imports: [ReactiveFormsModule, RouterLink],
  providers: [AdminControlDialogService],
  host: {'(document:keydown)': 'adminControlDialogService.onKeydown($event)'},
  templateUrl: './admin-control.component.html',
  styleUrl: './admin-control.component.scss'
})
export class AdminControlComponent {
  protected adminControlDialogService = inject(AdminControlDialogService);
}
