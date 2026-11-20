import {computed, inject, Injectable, signal} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {AdminControlService} from '../../user/admin-control.service';
import {PlayersService} from '../../players/players.service';

const ADMIN_CODE = '2626';

/** State and actions of the Admin Control dialog. The saved settings live in the shared AdminControlService. */
@Injectable()
export class AdminControlDialogService {
  private dialogRef = inject(MatDialogRef);
  private adminControlService = inject(AdminControlService);
  private playersService = inject(PlayersService);

  /** Opened from the header, which shows the admin button only to group admins. */
  manageGroupUrl = computed(() => this.playersService.groupUrl('manage-group'));

  // ---------- admin code ----------

  isCodeAccepted = signal(false);

  codeForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.pattern(new RegExp(`^${ADMIN_CODE}$`))]),
  });

  submitCode() {
    if (this.codeForm.getRawValue().code !== ADMIN_CODE) return;
    this.settingsForm.patchValue(this.adminControlService.getAdminControl());
    this.isCodeAccepted.set(true);
  }

  // ---------- settings ----------

  settingsForm = new FormGroup({
    showRating: new FormControl(false),
    showProtectedPages: new FormControl(false),
  });

  saveSettings() {
    this.adminControlService.setAdminControl(this.settingsForm.getRawValue());
    this.close();
  }

  toggleAllSettings() {
    this.adminControlService.setToggleAll(!this.adminControlService.getToggleAll());
    const isOn = this.adminControlService.getToggleAll();
    this.settingsForm.patchValue({showRating: isOn, showProtectedPages: isOn});
  }

  /** Shortcut: pressing "a" after the code toggles all settings and saves. */
  onKeydown(event: KeyboardEvent) {
    if (!this.isCodeAccepted() || event.key.toLowerCase() !== 'a') return;
    event.preventDefault();
    this.toggleAllSettings();
    setTimeout(() => this.saveSettings(), 500);
  }

  // ---------- delete all data (group owner only) ----------

  private canDeleteAll = computed(() => this.isCodeAccepted() && this.playersService.isGroupOwner());
  /** Deleting is two steps in place: the button, then Delete / Cancel (no second dialog). */
  private isAskingToDelete = signal(false);
  showDeleteButton = computed(() => this.canDeleteAll() && !this.isAskingToDelete());
  isConfirmingDelete = computed(() => this.canDeleteAll() && this.isAskingToDelete());

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

  close() {
    this.dialogRef.close();
  }
}
