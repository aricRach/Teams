import {Component, Signal, signal} from '@angular/core';
import {MenuAction, MenuItem, NavigationBarComponent} from 'ui'

@Component({
  selector: 'app-header',
  imports: [NavigationBarComponent],
  templateUrl: './header.component.html',
  standalone: true,
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  //
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
}
