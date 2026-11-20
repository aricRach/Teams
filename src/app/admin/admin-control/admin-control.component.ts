import {Component, computed, HostListener, inject, output, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AdminControlService} from '../../user/admin-control.service';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {PlayersService} from '../../players/players.service';

@Component({
  selector: 'app-admin.svg-control',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-control.component.html',
  styleUrl: './admin-control.component.scss'
})
export class AdminControlComponent {

  adminControlService = inject(AdminControlService);
  playersService = inject(PlayersService);

  isAllowed = signal(false);

  private canDeleteAll = computed(() => this.isAllowed() && this.playersService.isGroupOwner());
  /** Deleting is two steps in place: the button, then Delete / Cancel (no second dialog). */
  private isAskingToDelete = signal(false);
  showDeleteButton = computed(() => this.canDeleteAll() && !this.isAskingToDelete());
  isConfirmingDelete = computed(() => this.canDeleteAll() && this.isAskingToDelete());

  submitted = output();

  /** Opened from the header, which shows the admin button only to group admins. Clicking closes the modal. */
  manageGroupUrl = computed(() => this.playersService.groupUrl('manage-group'));

  codeForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.pattern(/^2626$/),]),
  });

  adminForm = new FormGroup({
    showRating: new FormControl(false),
    showProtectedPages: new FormControl(false),
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

  askToDeleteAll() {
    this.isAskingToDelete.set(true);
  }

  cancelDeleteAll() {
    this.isAskingToDelete.set(false);
  }

  deleteAll() {
    this.isAskingToDelete.set(false);
    this.playersService.deleteAllStatsAndSpecialCollections();
  }
}
