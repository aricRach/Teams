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
import {EditPlayerStatisticsComponent} from './manage-players/edit-statistics/edit-player-statistics.component';
import {EditStatisticsComponent} from './statistics/edit-statistics/edit-statistics.component';

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
        canActivate: [groupAdminGuard]
      },
      {
        path: 'statistics',
        component: StatisticsComponent,
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'table'
          },
          {
            path: 'table',
            component: PlayersStatisticsTableComponent
          },
          {
            path: 'team-of-the-week',
            component: TeamOfTheWeekComponent
          },
          {
            path: 'edit-statistics',
            component: EditStatisticsComponent
          }
        ]
      },
      {
        path: 'manage-players',
        component: ManagePlayersComponent,
        canActivate: [groupAdminGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'edit-player'
          },
          {
            path: 'edit-player',
            component: EditPlayerComponent,
          },
          {
            path: 'edit-player-statistics',
            component: EditPlayerStatisticsComponent
          }
        ]
      },
      {
        path: 'create-draft-session',
        component: CreateDraftSessionComponent,
        canActivate: [groupAdminGuard],
        resolve: {
          existingSession: getDraftSessionsByOwnerResolver
        },
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
