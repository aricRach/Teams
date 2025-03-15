import {Component, computed, inject} from '@angular/core';
import {MenuAction, NavigationBarComponent} from 'ui'
import {UserService} from '../user/user.service';
import {PlayersService} from '../players/players.service';

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
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
      link: '/home/edit-player'
    }
  ])
}
