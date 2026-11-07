import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { PopupsService } from 'ui';
import { PlayersService } from '../players/players.service';
import { ManageGroupApiService } from './manage-group-api.service';
import { runOptimistic } from '../shared/optimistic/run-optimistic';

type ListKey = 'admins' | 'members';

@Injectable()
export class ManageGroupService {
  private manageGroupApi = inject(ManageGroupApiService);
  private playersService = inject(PlayersService);
  private popupsService = inject(PopupsService);
  private auth = inject(Auth);

  adminEmailInput = signal('');
  memberEmailInput = signal('');
  showMemberInput = signal(false);

  groupId = computed<string>(() => this.playersService.selectedGroup()?.id);
  admins = computed<string[]>(() => this.playersService.selectedGroup()?.admins ?? []);
  members = computed<string[]>(() => this.playersService.selectedGroup()?.members ?? []);
  owner = computed<string | undefined>(() => this.playersService.selectedGroup()?.createdBy);
  myEmail = this.auth.currentUser?.email ?? '';
  addPlayersUrl = computed(() => this.playersService.groupUrl('players/register-players'));
  playersHubUrl = computed(() => this.playersService.groupUrl('players/manage-players'));

  isValidEmail(email: string): boolean {
    return Validators.email({ value: email.trim() } as any) === null;
  }

  // The owner and you can't be removed from admins, so nobody locks themselves out.
  canRemoveAdmin(email: string): boolean {
    return email !== this.owner() && email !== this.myEmail;
  }

  addAdmin() {
    this.add('admins', this.adminEmailInput, (email) => this.manageGroupApi.addAdmin(this.groupId(), email));
  }

  removeAdmin(email: string) {
    if (!this.canRemoveAdmin(email)) return;
    this.remove('admins', email, () => this.manageGroupApi.removeAdmin(this.groupId(), email));
  }

  addMember() {
    this.add('members', this.memberEmailInput, (email) => this.manageGroupApi.addMember(this.groupId(), email));
  }

  removeMember(email: string) {
    this.remove('members', email, () => this.manageGroupApi.removeMember(this.groupId(), email));
  }

  cancelAddMember() {
    this.showMemberInput.set(false);
    this.memberEmailInput.set('');
  }

  private add(key: ListKey, input: WritableSignal<string>, save: (email: string) => Promise<unknown>) {
    const email = input().trim();
    if (!this.isValidEmail(email)) return;
    if (this.playersService.selectedGroup()?.[key]?.includes(email)) {
      this.popupsService.addErrorPopOut(`${email} is already in the list.`);
      return;
    }
    input.set('');
    this.updateOptimistic(key, (list) => [...list, email], () => save(email), `Could not add ${email}, so it was removed.`);
  }

  private remove(key: ListKey, email: string, save: () => Promise<unknown>) {
    this.updateOptimistic(key, (list) => list.filter((e) => e !== email), save, `Could not remove ${email}, so it was put back.`);
  }

  private updateOptimistic(key: ListKey, change: (list: string[]) => string[], save: () => Promise<unknown>, errorMessage: string) {
    const previousGroup = this.playersService.selectedGroup();
    runOptimistic({
      apply: () => {
        this.playersService.selectedGroup.update((group: any) => ({ ...group, [key]: change(group?.[key] ?? []) }));
        // Clear the saved group list so /select-group reloads it with this change.
        this.playersService.userGroups.set(null);
      },
      rollback: () => this.playersService.selectedGroup.set(previousGroup),
      commit: save,
      onError: () => this.popupsService.addErrorPopOut(errorMessage),
    });
  }
}
