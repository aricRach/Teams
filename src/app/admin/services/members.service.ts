import {inject, Injectable} from '@angular/core';
import {SpinnerService} from '../../spinner.service';
import {PopupsService} from 'ui';
import {MembersApiService} from './members-api.service';

@Injectable({
  providedIn: 'root'
})
export class MembersService {

  membersApiService = inject(MembersApiService);
  spinnerService = inject(SpinnerService);
  popoutService = inject(PopupsService);

  async addMember(selectedGroupId: string, email?: string): Promise<void> {
    if (!email) return;
    this.spinnerService.setIsLoading(true);
    try {
      await this.membersApiService.addMember(selectedGroupId, email);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to add member email`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }

  async addMembers(selectedGroupId: string, emails: string[]): Promise<void> {
    if (!emails || emails.length === 0) return;
    this.spinnerService.setIsLoading(true);
    try {
      return await this.membersApiService.addMembers(selectedGroupId, emails);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to add member email`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }

  async removeMember(selectedGroupId: string, email?: string): Promise<void> {
    if (!email) return;
    this.spinnerService.setIsLoading(true);
    try {
      await this.membersApiService.removeMember(selectedGroupId, email);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to remove member ${email}`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }

  async replaceEmail(selectedGroupId: string, oldEmail: string, newEmail: string): Promise<void> {
    this.spinnerService.setIsLoading(true);
    try {
      await this.membersApiService.replaceMember(selectedGroupId, oldEmail, newEmail);
    } catch {
      this.popoutService.addErrorPopOut(`Failed to replace email member`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }
}
