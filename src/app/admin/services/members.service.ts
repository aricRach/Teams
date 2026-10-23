import {inject, Injectable} from '@angular/core';
import {PopupsService} from 'ui';
import {MembersApiService} from './members-api.service';

@Injectable({
  providedIn: 'root'
})
export class MembersService {

  membersApiService = inject(MembersApiService);
  popoutService = inject(PopupsService);

  async addMember(selectedGroupId: string, email?: string): Promise<void> {
    if (!email) return;
    try {
      await this.membersApiService.addMember(selectedGroupId, email);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to add member email`);
    }
  }

  async addMembers(selectedGroupId: string, emails: string[]): Promise<void> {
    if (!emails || emails.length === 0) return;
    try {
      return await this.membersApiService.addMembers(selectedGroupId, emails);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to add member email`);
    }
  }

  async removeMember(selectedGroupId: string, email?: string): Promise<void> {
    if (!email) return;
    try {
      await this.membersApiService.removeMember(selectedGroupId, email);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to remove member ${email}`);
    }
  }

  async replaceEmail(selectedGroupId: string, oldEmail: string, newEmail: string): Promise<void> {
    try {
      await this.membersApiService.replaceMember(selectedGroupId, oldEmail, newEmail);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to replace email member`);
    }
  }
}
