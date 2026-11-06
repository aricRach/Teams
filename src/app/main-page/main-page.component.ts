import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {HeaderComponent} from '../header/header.component';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {PopupsService} from 'ui';
import {environment} from '../../environments/environment';
import {BreadcrumbsService} from '../shared/breadcrumbs/breadcrumbs.service';
import {BreadcrumbsComponent} from 'ui';
import {distinctUntilChanged, map, Subscription} from 'rxjs';
import {PlayersService} from '../players/players.service';
import {MenuAction} from 'ui';
import {AdminControlService} from '../user/admin-control.service';

@Component({
  selector: 'app-main-page',
  imports: [
    HeaderComponent,
    RouterOutlet,
    BreadcrumbsComponent
  ],
  templateUrl: './main-page.component.html',
  standalone: true,
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent implements OnInit, OnDestroy {
  breadcrumbsService = inject(BreadcrumbsService);
  private playersService = inject(PlayersService);
  private adminControlService = inject(AdminControlService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private popupsService = inject(PopupsService);
  breadcrumbs = signal([]);

  subscription = new Subscription();

  headerTitle = computed(() => this.playersService.selectedGroup()?.name || 'TeamsRach');
  headerIsAdmin = computed(() => this.playersService.isAdmin());
  canShare = computed(() => !!this.playersService.selectedGroup() && this.playersService.isMember());

  /** Shares the current page. The URL already contains the group id (/home/<groupId>/...). */
  async shareLink() {
    const link = `${environment.domain}/#${this.router.url}`;

    if (navigator.share) {
      try {
        await navigator.share({title: this.headerTitle(), url: link});
      } catch {} // user closed the share sheet
      return;
    }
    navigator.clipboard.writeText(link).then(
      () => this.popupsService.addSuccessPopOut('Link copied to clipboard!'),
      () => this.popupsService.addErrorPopOut("Couldn't copy the link."),
    );
  }

  headerNavItems = computed(() => [
    {
      action: MenuAction.NAVIGATE,
      alias: 'Game',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
      link: this.playersService.groupUrl('game')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Statistics',
      show: !!this.playersService.selectedGroup(),
      link: this.playersService.groupUrl('statistics')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Matches',
      show: !!this.playersService.selectedGroup(),
      link: this.playersService.groupUrl('matches')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Players',
      show: !!this.playersService.selectedGroup() && !this.playersService.isAdmin(),
      link: this.playersService.groupUrl('players/manage-players')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Players',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
      link: this.playersService.groupUrl('players')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Create draft',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
      link: this.playersService.groupUrl('create-draft-session')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Fantasy',
      show: !!this.playersService.selectedGroup(),
      link: this.playersService.groupUrl('fantasy')
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Gallery',
      show: !!this.playersService.selectedGroup() && this.playersService.isGroupOwner(),
      link: this.playersService.groupUrl('gallery')
    }
  ]);

  ngOnInit() {
    // Angular reuses this component when only :groupId changes (e.g. opening another group's link
    // in the same tab), so reload the group's players on every group change, not just on init.
    this.subscription.add(this.route.paramMap.pipe(
      map(params => params.get('groupId')),
      distinctUntilChanged()
    ).subscribe(() => {
      this.adminControlService.cleanAdminControlState();
      this.playersService.loadGroupPlayers();
    }));

    this.subscription.add(this.breadcrumbsService.getBreadcrumbs().subscribe((a) => {
      this.breadcrumbs.set(a as any);
    }))
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
