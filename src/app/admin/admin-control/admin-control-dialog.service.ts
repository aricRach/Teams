import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {AdminControlService} from '../../user/admin-control.service';
import {PopupsService} from 'ui';
import {PlayersService} from '../../players/players.service';
import {PlayersApiService} from '../../players/players-api.service';
import {createMutation} from '../../shared/optimistic/run-optimistic';
import {MatchEventsApiService} from '../../match-event-manager/services/match-events-api.service';

const ADMIN_CODE = '2626';

/** State and actions of the Admin Control dialog. The saved settings live in the shared AdminControlService. */
@Injectable()
export class AdminControlDialogService {
  private dialogRef = inject(MatDialogRef);
  private adminControlService = inject(AdminControlService);
  private playersService = inject(PlayersService);
  private playersApiService = inject(PlayersApiService);
  private popupsService = inject(PopupsService);
  private matchEventsApiService = inject(MatchEventsApiService);

  constructor() {
    // A shortcut save still waiting must not run after the dialog closed.
    inject(DestroyRef).onDestroy(() => clearTimeout(this.shortcutSaveTimer));
  }

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
    for (const control of Object.values(this.settingsForm.controls)) {
      control.setValue(isOn);
    }
  }

  private shortcutSaveTimer?: ReturnType<typeof setTimeout>;

  /** Shortcut: pressing "a" after the code toggles all settings and saves. Repeat presses wait for that save. */
  onKeydown(event: KeyboardEvent) {
    const isShortcut = this.isCodeAccepted() && event.key?.toLowerCase() === 'a';
    if (!isShortcut || this.shortcutSaveTimer) return;
    event.preventDefault();
    this.toggleAllSettings();
    this.shortcutSaveTimer = setTimeout(() => this.saveSettings(), 500);
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

  readonly deleteAllData = createMutation({
    run: async () => {
      const groupId = this.playersService.selectedGroup().id;
      await this.matchEventsApiService.deleteAllFinishedMatches(groupId);
      await this.playersApiService.deleteAllStatsAndSpecialCollections(groupId);
    },
    onSuccess: () => {
      this.isAskingToDelete.set(false);
      this.popupsService.addSuccessPopOut('All matches, statistics, Team of the Week and Fantasy data was deleted.');
    },
    // Large groups delete in several batches, so a failure can leave part of the data deleted.
    onError: () => this.popupsService.addErrorPopOut('Could not delete all the data. Try again to finish deleting.'),
  });

  close() {
    this.dialogRef.close();
  }
}
