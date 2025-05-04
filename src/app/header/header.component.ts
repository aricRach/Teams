import {Component, computed, inject} from '@angular/core';
import {MenuAction, NavigationBarComponent} from 'ui'
import {UserService} from '../user/user.service';
import {PlayersService} from '../players/players.service';
import {AdminControlService} from '../user/admin-control.service';

@Component({
  selector: 'app-header',
  imports: [NavigationBarComponent],
  providers: [UserService],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  playersService = inject(PlayersService);
  adminControlService = inject(AdminControlService);

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
      alias: 'Edit player',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin() && this.adminControlService.adminControl().isAdminMode,
      link: '/home/edit-player'
    },
    // {
    //   action: MenuAction.NAVIGATE,
    //   alias: 'Team draft',
    //   show: true,
    //   link: '/home/team-draft'
    // },
    {
      action: MenuAction.NAVIGATE,
      alias: 'create draft',
      show: true,
      link: '/home/create-draft-session'
    }
  ])
}
