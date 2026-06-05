import { Routes } from '@angular/router';
import {StatisticsComponent} from './statistics/statistics/statistics.component';
import {GameComponent} from './game/game.component';
import {MainPageComponent} from './main-page/main-page.component';
import {SelectGroupComponent} from './select-group/select-group.component';
import {getGroupPlayersResolver} from './resolvers/get-group-players.resolver';
import {SignInComponent} from './user/sign-in/sign-in.component';
import {getUserGroupsResolver} from './resolvers/get-user-groups.resolver';
import {groupAdminGuard} from './guards/group-admin.guard';
import {authRoutesGuard} from './guards/auth-routes.guard';
import {EditPlayerComponent} from './manage-players/edit-player/edit-player.component';
import {TeamOfTheWeekComponent} from './team-of-the-week/team-of-the-week.component';
import {PlayersStatisticsTableComponent} from './players-statistics-table/players-statistics-table.component';
import {MatchesComponent} from './match-event-manager/matches/matches.component';
import {MatchesTimelineComponent} from './match-event-manager/matches-timeline/matches-timeline.component';
import {MatchEventsManagerComponent} from './match-event-manager/match-events-manager/match-events-manager.component';
import {TeamDraftComponent} from './team-draft/team-draft.component';
import {CreateDraftSessionComponent} from './create-draft-session/create-draft-session.component';
import {getDraftSessionsByOwnerResolver} from './create-draft-session/resolver/get-draft-sessions-by-owner.resolver';
import {signInPageGuard} from './guards/sign-in-page.guard';
import {ManagePlayersComponent} from './manage-players/manage-players/manage-players.component';
import {EditStatisticsComponent} from './statistics/edit-statistics/edit-statistics.component';
import {PlayerProgressChartComponent} from './manage-players/player-progress-chart/player-progress-chart.component';
import {FantasyDraftComponent} from './fantasy/fantasy-draft/fantasy-draft.component';
import {FantasyAnalyticsComponent} from './fantasy/fantasy-analytics/fantasy-analytics.component';
import {draftMetaResolver} from './fantasy/resolvers/draft-meta.resolver';
import {ManageFantasyMetaComponent} from './fantasy/manage-fantasy-meta/manage-fantasy-meta.component';
import {FantasyComponent} from './fantasy/fantasy/fantasy.component';
import {fantasyAllUsersPicksResolver} from './fantasy/resolvers/fantasy-all-users-picks.resolver';
import {exitFormGuard} from './guards/exit-form.guard';
import {exitFantasyDraftGuard} from './fantasy/guards/exit-fantasy-draft.guard';
import {adminControlGuard} from './guards/admin-control.guard';
import {inactivePlayersResolver} from './manage-players/resolvers/inactive-players.resolver';
import {RatePlayersComponent} from './players/rate-players/rate-players.component';
import {getSpecificGroupPlayersResolver} from './resolvers/get-specific-group-players.resolver';
import {groupOwnerGuard} from './guards/group-owner.guard';
import {superAdminGuard} from './guards/super-admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: SignInComponent,
    canActivate: [signInPageGuard]
  },
  {
    path: 'select-group',
    component: SelectGroupComponent,
    resolve: {
      groups: getUserGroupsResolver
    },
    canActivate: [authRoutesGuard],
  },
  {
    path: 'create-group',
    loadComponent: () => import('./create-group/create-group.component').then(m => m.CreateGroupComponent),
    canActivate: [authRoutesGuard, superAdminGuard]
  },
  {
    path: 'home',
    component: MainPageComponent,
    resolve: {
      allPlayers: getGroupPlayersResolver
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: GameComponent,
        canDeactivate: [exitFormGuard]
      },
      {
        path: 'game',
        component: GameComponent,
        canActivate: [groupAdminGuard],
        canDeactivate: [exitFormGuard],
        data: { breadcrumb: 'Game' },
      },
      {
        path: 'statistics',
        component: StatisticsComponent,
        data: { breadcrumb: 'Statistics' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'table'
          },
          {
            path: 'table',
            component: PlayersStatisticsTableComponent,
            data: { breadcrumb: 'Table' },
          },
          {
            path: 'team-of-the-week',
            component: TeamOfTheWeekComponent,
            data: { breadcrumb: 'TOTW' },
          },
          {
            path: 'edit-statistics',
            component: EditStatisticsComponent,
            data: { breadcrumb: 'Edit Statistics' },
            canActivate: [groupAdminGuard, adminControlGuard],
          }
        ]
      },
      {
        path: 'matches',
        component: MatchesComponent,
        data: { breadcrumb: 'Matches' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'timeline'
          },
          {
            path: 'timeline',
            component: MatchesTimelineComponent,
            data: { breadcrumb: 'Timeline' },
          },
          {
            path: 'manage-events',
            component: MatchEventsManagerComponent,
            data: { breadcrumb: 'Manage Events' },
          },
        ]
      },
      {
        path: 'players',
        data: { breadcrumb: 'Players' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./manage-players/players-landing-page/players-landing-page.component').then(m => m.PlayersLandingPageComponent),
            canActivate: [groupAdminGuard],
          },
          {
            path: 'register-players',
            loadComponent: () => import('./register-players/register-players/register-players.component').then(
              (m) => m.RegisterPlayersComponent
            ),
            canActivate: [groupAdminGuard],
            canDeactivate: [exitFormGuard],
            data: { breadcrumb: 'Register Players' },
          },
          {
            path: 'manage-players',
            component: ManagePlayersComponent,
            data: { breadcrumb: 'Players Hub' },
            children: [
              {
                path: '',
                pathMatch: 'full',
                redirectTo: 'player-progress'
              },
              {
                path: 'edit-player',
                component: EditPlayerComponent,
                canActivate: [groupAdminGuard, adminControlGuard],
                canDeactivate: [exitFormGuard],
                data: { breadcrumb: 'Edit Player' },
              },
              {
                path: 'edit-player-statistics',
                loadComponent: () =>
                  import('./manage-players/edit-statistics/edit-player-statistics.component').then(
                    (m) => m.EditPlayerStatisticsComponent
                  ),
                canActivate: [groupAdminGuard, adminControlGuard],
                canDeactivate: [exitFormGuard],
                data: { breadcrumb: 'Edit Player Statistics' },
              },
              {
                path: 'player-progress',
                component: PlayerProgressChartComponent,
                data: { breadcrumb: 'Player Progress' },
              },
            ]
          },
          {
            path: 'reactivate-players',
            loadComponent: () =>
              import('./manage-players/reactivate-players/reactivate-players.component').then(
                (m) => m.ReactivatePlayersComponent
              ),
            canActivate: [groupAdminGuard],
            resolve: {
              inactivePlayers: inactivePlayersResolver
            },
            data: { breadcrumb: 'Reactivate Players' },
          },
          {
            path: 'community-ratings',
            loadComponent: () =>
              import('./manage-players/community-ratings/community-ratings.component').then(
                (m) => m.CommunityRatingsComponent
              ),
            canActivate: [groupAdminGuard, adminControlGuard],
            data: { breadcrumb: 'Community Ratings' },
          },
        ]
      },
      {
        path: 'create-draft-session',
        component: CreateDraftSessionComponent,
        canActivate: [groupAdminGuard],
        resolve: {
          existingSession: getDraftSessionsByOwnerResolver
        },
        canDeactivate: [exitFormGuard],
        data: { breadcrumb: 'Create Draft' },
      },
      {
        path: 'fantasy',
        component: FantasyComponent,
        resolve: {
          fantasyMeta: draftMetaResolver
        },
        runGuardsAndResolvers: 'pathParamsOrQueryParamsChange',
        data: { breadcrumb: 'Fantasy' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'analytics'
          },
          {
            path: 'draft',
            component: FantasyDraftComponent,
            canDeactivate: [exitFantasyDraftGuard]
          },
          {
            path: 'analytics',
            component: FantasyAnalyticsComponent,
            resolve: {
              fantasyAllUsersPicks: fantasyAllUsersPicksResolver,
              inactivePlayers: inactivePlayersResolver
            }
          },
          {
            path: 'manage-fantasy-meta',
            component: ManageFantasyMetaComponent,
            canActivate: [groupAdminGuard],
            canDeactivate: [exitFormGuard]
          }
        ]
      },
      {
        path: 'gallery',
        loadComponent: () => import('./gallery/gallery.component').then(m => m.GalleryComponent),
        canActivate: [groupOwnerGuard]
      }
    ]
  },
  {
    path: 'rate-players/:groupId',
    component: RatePlayersComponent,
    resolve: {
      allPlayers: getSpecificGroupPlayersResolver
    },
    canActivate: [authRoutesGuard]
  },
  {
    path: 'team-draft/:groupId/:sessionId',
    component: TeamDraftComponent,
    canActivate: [authRoutesGuard]
  },
];
