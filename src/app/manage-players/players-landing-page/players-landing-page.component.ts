import {Component, computed, inject, signal} from '@angular/core';
import {LandingPageComponent, NavigationItemType} from 'ui';
import {AdminControlService} from '../../user/admin-control.service';
import {PlayersService} from '../../players/players.service';

@Component({
  selector: 'app-players-landing-page',
  imports: [LandingPageComponent],
  templateUrl: './players-landing-page.component.html',
  styleUrl: './players-landing-page.component.scss'
})
export class PlayersLandingPageComponent {

  adminControlService = inject(AdminControlService);
  playersService = inject(PlayersService);

  showRating = computed(() => {
    return this.adminControlService.getAdminControl().showRating
  })
  pages = computed(() =>
    [
      { alias: 'Add Players', link: this.playersService.groupUrl('players/register-players'), type: NavigationItemType.LINK },
      { alias: 'Players Hub', link: this.playersService.groupUrl('players/manage-players/player-progress'), type: NavigationItemType.LINK },
      { alias: 'Reactivate Players', link: this.playersService.groupUrl('players/reactivate-players'), type: NavigationItemType.LINK },
      { alias: 'Community Ratings', link: this.playersService.groupUrl('players/community-ratings'), disabled: !this.showRating(),
        tooltip: this.showRating() ? '' : 'In order to see this page enable show protected pages in admin control', type: NavigationItemType.LINK },
    ])
}
