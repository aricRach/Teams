import { inject, Injectable, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { form, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { CreateGroupApiService } from './create-group-api.service';
import { PlayersService } from '../players/players.service';
import { PopupsService } from 'ui';

@Injectable()
export class CreateGroupService {
  private createGroupApi = inject(CreateGroupApiService);
  private playersService = inject(PlayersService);
  private router = inject(Router);
  private popupsService = inject(PopupsService);

  nameModel = signal({ name: '' });
  nameForm = form(this.nameModel, (fields) => {
    required(fields.name);
  });

  memberEmailInput = signal('');
  adminEmailInput = signal('');
  members = signal<string[]>([]);
  admins = signal<string[]>([]);
  submitting = signal(false);

  isValidEmail(email: string): boolean {
    return Validators.email({ value: email.trim() } as any) === null;
  }

  addMember() {
    const email = this.memberEmailInput().trim();
    if (!this.isValidEmail(email) || this.members().includes(email)) return;
    this.members.update(list => [...list, email]);
    this.memberEmailInput.set('');
  }

  removeMember(email: string) {
    this.members.update(list => list.filter(e => e !== email));
  }

  addAdmin() {
    const email = this.adminEmailInput().trim();
    if (!this.isValidEmail(email) || this.admins().includes(email)) return;
    this.admins.update(list => [...list, email]);
    this.adminEmailInput.set('');
  }

  removeAdmin(email: string) {
    this.admins.update(list => list.filter(e => e !== email));
  }

  async submit() {
    if (this.nameForm().invalid() || !this.nameModel().name.trim()) return;
    this.submitting.set(true);
    try {
      const id = await this.createGroupApi.createGroup(
        this.nameModel().name.trim(),
        this.members(),
        this.admins()
      );
      if (id) {
        this.playersService.userGroups.set(null);
        this.popupsService.addSuccessPopOut('Group created!');
        this.router.navigate(['/select-group']);
      } else {
        this.popupsService.addErrorPopOut('Failed to create group.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
