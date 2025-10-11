import {Component, HostListener, inject, output, signal} from '@angular/core';
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
    showRating: new FormControl(false),
    showProtectedPages: new FormControl(false),
    showSaveButtons: new FormControl(false),
    showMakeBalanceTeams: new FormControl(false),
    hideGuests: new FormControl(false),
  });

  submitAdminControl() {
    this.adminControlService.setAdminControl(this.adminForm.getRawValue());
    this.submitted.emit();
  }

  submitCode() {
    if(this.codeForm.get('code')?.value === '2626') {
      this.adminForm.patchValue(this.adminControlService.getAdminControl());
      this.isAllowed.set(true);
    }
  }

  selectAll() {
    this.adminControlService.setToggleAll(!this.adminControlService.getToggleAll());
    const updatedValues: Record<string, boolean> = {};

    for (const key of Object.keys(this.adminForm.controls)) {
      updatedValues[key] = this.adminControlService.getToggleAll();
    }

    this.adminForm.patchValue(updatedValues);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if(!this.isAllowed()) {
      return
    }
    if (event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectAll();
      setTimeout(() => {
        this.submitAdminControl();
      }, 500)
    }
  }
}
