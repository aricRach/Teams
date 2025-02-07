import {Component, inject} from '@angular/core';
import {MenuAction, MenuItem, NavigationBarComponent} from 'ui'
import {UserService} from '../user/user.service';

@Component({
  selector: 'app-header',
  imports: [NavigationBarComponent],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {


  userService = inject(UserService);
  title = 'Rach';
  navItems: MenuItem[] = [
    {
      action: MenuAction.NAVIGATE,
      alias: 'Game',
      show: true,
      link: '/'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Statistics',
      show: true,
      link: '/statistics'
    }
  ]

  login() {
    this.userService.googleLogin();
  }
}
