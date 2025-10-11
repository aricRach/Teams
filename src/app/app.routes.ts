import { Routes } from '@angular/router';
import {StatisticsComponent} from './statistics/statistics/statistics.component';
import {GameComponent} from './game/game.component';
import {MainPageComponent} from './main-page/main-page.component';
import {SelectGroupComponent} from './select-group/select-group.component';
import {getGroupPlayersResolver} from './resolvers/get-group-players.resolver';
import {SignInComponent} from './user/sign-in/sign-in.component';
import {getUserGroupsResolver} from './resolvers/get-user-groups.resolver';
import {groupAdminGuard} from './guards/group-admin.guard';
import {AuthGuard} from '@angular/fire/auth-guard';
import {authRoutesGuard} from './guards/auth-routes.guard';
import {EditPlayerComponent} from './manage-players/edit-player/edit-player.component';
import {TeamOfTheWeekComponent} from './team-of-the-week/team-of-the-week.component';
import {PlayersStatisticsTableComponent} from './players-statistics-table/players-statistics-table.component';
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
    canActivate: [AuthGuard],
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
        component: GameComponent
      },
      {
        path: 'game',
        component: GameComponent,
        canActivate: [groupAdminGuard],
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
              fantasyAllUsersPicks: fantasyAllUsersPicksResolver
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
      // {
      //   path: 'rate-players',
      //   component: RatePlayersComponent,
      // },
    ]
  },
  {
    path: 'team-draft/:groupId/:sessionId',
    component: TeamDraftComponent,
    canActivate: [authRoutesGuard]
  },
];
