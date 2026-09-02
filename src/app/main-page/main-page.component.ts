import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {HeaderComponent} from '../header/header.component';
import {RouterOutlet} from '@angular/router';
import {BreadcrumbsService} from '../shared/breadcrumbs/breadcrumbs.service';
import {BreadcrumbsComponent} from 'ui';
import {AsyncPipe} from '@angular/common';
import {Subscription} from 'rxjs';
import {PlayersService} from '../players/players.service';
import {MenuAction} from 'ui';

@Component({
  selector: 'app-main-page',
  imports: [
    HeaderComponent,
    RouterOutlet,
    BreadcrumbsComponent,
    AsyncPipe
  ],
  templateUrl: './main-page.component.html',
  standalone: true,
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent implements OnInit, OnDestroy {
  breadcrumbsService = inject(BreadcrumbsService);
  private playersService = inject(PlayersService);
  breadcrumbs = signal([]);

  subscription = new Subscription();

  headerTitle = computed(() => this.playersService.selectedGroup()?.name || 'TeamsRach');
  headerIsAdmin = computed(() => this.playersService.isAdmin());

  headerNavItems = computed(() => [
    {
      action: MenuAction.NAVIGATE,
      alias: 'Game',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
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
      alias: 'Matches',
      show: !!this.playersService.selectedGroup(),
      link: '/home/matches'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Players',
      show: !!this.playersService.selectedGroup() && !this.playersService.isAdmin(),
      link: '/home/players/manage-players'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Players',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
      link: '/home/players'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Create draft',
      show: !!this.playersService.selectedGroup() && this.playersService.isAdmin(),
      link: '/home/create-draft-session'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Fantasy',
      show: !!this.playersService.selectedGroup(),
      link: '/home/fantasy'
    },
    {
      action: MenuAction.NAVIGATE,
      alias: 'Gallery',
      show: !!this.playersService.selectedGroup() && this.playersService.isGroupOwner(),
      link: '/home/gallery'
    }
  ]);

  ngOnInit() {
    this.subscription.add(this.breadcrumbsService.getBreadcrumbs().subscribe((a) => {
      this.breadcrumbs.set(a as any);
    }))
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
