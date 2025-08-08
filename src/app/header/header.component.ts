import {Component, computed, inject} from '@angular/core';
import {MenuAction, ModalsService, NavigationBarComponent} from 'ui'
import {UserService} from '../user/user.service';
import {PlayersService} from '../players/players.service';
import {AdminControlService} from '../user/admin-control.service';
import {FormsModule} from '@angular/forms';
import {ModalComponent} from '../../modals/modal/modal.component';
import {AdminControlComponent} from '../admin/admin-control/admin-control.component';

@Component({
  selector: 'app-header',
  imports: [NavigationBarComponent, FormsModule, ModalComponent],
  providers: [UserService],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);
  modalsService = inject(ModalsService);

  title = computed(() => this.playersService.selectedGroup()?.name || 'TeamsRach');
  navItems = computed(() => [
    {
      action: MenuAction.NAVIGATE,
      alias: 'Game',
      show: this.playersService.isAdmin(),
      link: '/home/game'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Statistics',
      show: !!this.playersService.selectedGroup(),
      link: '/home/statistics'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Manage players',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin() && this.adminControlService.getAdminControl().showProtectedPages,
      link: '/home/manage-players'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'create draft',
      show: this.playersService.isAdmin(),
      link: '/home/create-draft-session'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'fantasy',
      show: true,
      link: '/home/fantasy'
    }
  ])

  openAdminControl() {
    const dialogRef = this.modalsService.openComponentModal(AdminControlComponent, {
      width: 300,
      height: 400,
    });
    // @ts-ignore
    dialogRef.componentInstance.submitted.subscribe(() => {
      dialogRef.close();
    });
  }
}
