import { Routes } from '@angular/router';
import {StatisticsComponent} from './statistics/statistics.component';
import {GameComponent} from './game/game.component';
import {MainPageComponent} from './main-page/main-page.component';
import {SelectGroupComponent} from './select-group/select-group.component';
import {getGroupPlayersResolver} from './resolvers/get-group-players.resolver';
import {SignInComponent} from './user/sign-in/sign-in.component';
import {getUserGroupsResolver} from './resolvers/get-user-groups.resolver';
import {groupAdminGuard} from './guards/group-admin.guard';
import {AuthGuard} from '@angular/fire/auth-guard';
import {authRoutesGuard} from './guards/auth-routes.guard';
import {EditPlayerComponent} from './players/edit-player/edit-player.component';
import {TeamOfTheWeekComponent} from './team-of-the-week/team-of-the-week.component';
import {PlayersStatisticsTableComponent} from './players-statistics-table/players-statistics-table.component';

export const routes: Routes = [
  {
    path: '',
    component: SignInComponent,
    canActivate: [authRoutesGuard]

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
            path: 'table',
            component: PlayersStatisticsTableComponent
          },
          {
            path: 'team-of-the-week',
            component: TeamOfTheWeekComponent
          }
        ]
      },
      {
        path: 'edit-player',
        component: EditPlayerComponent,
        canActivate: [groupAdminGuard]
      },
      // {
      //   path: 'rate-players',
      //   component: RatePlayersComponent,
      // },
      // {
      //   path: 'team-of-the-week',
      //   component: TeamOfTheWeekComponent,
      // },
    ]
  },
];
