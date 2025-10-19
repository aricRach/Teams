import {Component, signal} from '@angular/core';
import {LandingPageComponent, NavigationItemType} from 'ui';

@Component({
  selector: 'app-players-landing-page',
  imports: [LandingPageComponent],
  templateUrl: './players-landing-page.component.html',
  styleUrl: './players-landing-page.component.scss'
})
export class PlayersLandingPageComponent {

  pages = signal(
    [
      { alias: 'Register Players', link: '/home/players/register-players', show: true, type: NavigationItemType.LINK },
      { alias: 'Players Hub', link: '/home/players/manage-players/player-progress', show: true, type: NavigationItemType.LINK },
      { alias: 'Reactivate Players', link: '/home/players/reactivate-players', show: true, type: NavigationItemType.LINK },
    ])
}
