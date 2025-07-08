import {Component, inject, output, signal} from '@angular/core';
import {AdminControlService} from '../../user/admin-control.service';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';

@Component({
  selector: 'app-admin.svg-control',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-control.component.html',
  styleUrl: './admin-control.component.scss'
})
export class AdminControlComponent {

  adminControlService = inject(AdminControlService);

  isAllowed = signal(false);

  submitted = output();

  codeForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.pattern(/^2626$/),]),
  });

  adminForm = new FormGroup({
    showAddPlayerForm: new FormControl(false),
    showRating: new FormControl(false),
    showStatistics: new FormControl(false),
    showProtectedPages: new FormControl(false),
    showSaveButtons: new FormControl(false),
    showMakeBalanceTeams: new FormControl(false),
  });

  submitAdminControl() {
    this.adminControlService.setAdminControl(this.adminForm.getRawValue());
    this.submitted.emit();
  }

  submitCode() {
    if(this.codeForm.get('code')?.value === '2626') {
      this.adminForm.patchValue(this.adminControlService.adminControl());
      this.isAllowed.set(true);
    } else {

    }
  }
}
