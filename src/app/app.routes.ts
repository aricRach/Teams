import { Routes } from '@angular/router';
import {GameComponent} from './game/game.component';
import {MainPageComponent} from './main-page/main-page.component';
import {SelectGroupComponent} from './select-group/select-group.component';
import {selectedGroupGuard} from './guards/selected-group.guard';
import {SignInComponent} from './user/sign-in/sign-in.component';
import {getUserGroupsResolver} from './resolvers/get-user-groups.resolver';
import {groupAdminGuard} from './guards/group-admin.guard';
import {authRoutesGuard} from './guards/auth-routes.guard';
import {getDraftSessionsByOwnerResolver} from './create-draft-session/resolver/get-draft-sessions-by-owner.resolver';
import {signInPageGuard} from './guards/sign-in-page.guard';
import {draftMetaResolver} from './fantasy/resolvers/draft-meta.resolver';
import {fantasyAllUsersPicksResolver} from './fantasy/resolvers/fantasy-all-users-picks.resolver';
import {exitFormGuard} from './guards/exit-form.guard';
import {exitFantasyDraftGuard} from './fantasy/guards/exit-fantasy-draft.guard';
import {adminControlGuard} from './guards/admin-control.guard';
import {inactivePlayersResolver} from './manage-players/resolvers/inactive-players.resolver';
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
    canActivate: [selectedGroupGuard],
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
        loadComponent: () => import('./statistics/statistics/statistics.component').then(m => m.StatisticsComponent),
        data: { breadcrumb: 'Statistics' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'table'
          },
          {
            path: 'table',
            loadComponent: () => import('./players-statistics-table/players-statistics-table.component').then(m => m.PlayersStatisticsTableComponent),
            data: { breadcrumb: 'Table' },
          },
          {
            path: 'team-of-the-week',
            loadComponent: () => import('./team-of-the-week/team-of-the-week.component').then(m => m.TeamOfTheWeekComponent),
            data: { breadcrumb: 'TOTW' },
          },
          {
            path: 'edit-statistics',
            loadComponent: () => import('./statistics/edit-statistics/edit-statistics.component').then(m => m.EditStatisticsComponent),
            data: { breadcrumb: 'Edit Statistics' },
            canActivate: [groupAdminGuard, adminControlGuard],
          }
        ]
      },
      {
        path: 'matches',
        loadComponent: () => import('./match-event-manager/matches/matches.component').then(m => m.MatchesComponent),
        data: { breadcrumb: 'Matches' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'timeline'
          },
          {
            path: 'timeline',
            loadComponent: () => import('./match-event-manager/matches-timeline/matches-timeline.component').then(m => m.MatchesTimelineComponent),
            data: { breadcrumb: 'Timeline' },
          },
          {
            path: 'league',
            loadComponent: () => import('./match-event-manager/league-table/league-table.component').then(m => m.LeagueTableComponent),
            data: { breadcrumb: 'League' },
          },
          {
            path: 'manage-events',
            loadComponent: () => import('./match-event-manager/match-events-manager/match-events-manager.component').then(m => m.MatchEventsManagerComponent),
            canActivate: [groupAdminGuard],
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
            loadComponent: () => import('./manage-players/manage-players/manage-players.component').then(m => m.ManagePlayersComponent),
            data: { breadcrumb: 'Players Hub' },
            children: [
              {
                path: '',
                pathMatch: 'full',
                redirectTo: 'player-progress'
              },
              {
                path: 'edit-player',
                loadComponent: () => import('./manage-players/edit-player/edit-player.component').then(m => m.EditPlayerComponent),
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
                loadComponent: () => import('./manage-players/player-progress-chart/player-progress-chart.component').then(m => m.PlayerProgressChartComponent),
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
        loadComponent: () => import('./create-draft-session/create-draft-session.component').then(m => m.CreateDraftSessionComponent),
        canActivate: [groupAdminGuard],
        resolve: {
          existingSession: getDraftSessionsByOwnerResolver
        },
        canDeactivate: [exitFormGuard],
        data: { breadcrumb: 'Create Draft' },
      },
      {
        path: 'fantasy',
        loadComponent: () => import('./fantasy/fantasy/fantasy.component').then(m => m.FantasyComponent),
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
            loadComponent: () => import('./fantasy/fantasy-draft/fantasy-draft.component').then(m => m.FantasyDraftComponent),
            canDeactivate: [exitFantasyDraftGuard]
          },
          {
            path: 'analytics',
            loadComponent: () => import('./fantasy/fantasy-analytics/fantasy-analytics.component').then(m => m.FantasyAnalyticsComponent),
            resolve: {
              fantasyAllUsersPicks: fantasyAllUsersPicksResolver,
              inactivePlayers: inactivePlayersResolver
            }
          },
          {
            path: 'manage-fantasy-meta',
            loadComponent: () => import('./fantasy/manage-fantasy-meta/manage-fantasy-meta.component').then(m => m.ManageFantasyMetaComponent),
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
    loadComponent: () => import('./players/rate-players/rate-players.component').then(m => m.RatePlayersComponent),
    resolve: {
      allPlayers: getSpecificGroupPlayersResolver
    },
    canActivate: [authRoutesGuard]
  },
  {
    path: 'team-draft/:groupId/:sessionId',
    loadComponent: () => import('./team-draft/team-draft.component').then(m => m.TeamDraftComponent),
    canActivate: [authRoutesGuard]
  },
  {
    path: 'reveal',
    loadComponent: () => import('./reveal/reveal.component').then(m => m.RevealComponent),
  },
];
