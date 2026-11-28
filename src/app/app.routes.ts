import { Routes } from '@angular/router';
import {GameComponent} from './game/game.component';
import {MainPageComponent} from './main-page/main-page.component';
import {SelectGroupComponent} from './select-group/select-group.component';
import {groupHomeRedirectGuard, lastGroupRedirectGuard, selectedGroupGuard} from './guards/selected-group.guard';
import {SignInComponent} from './user/sign-in/sign-in.component';
import {getUserGroupsResolver} from './resolvers/get-user-groups.resolver';
import {groupAdminGuard} from './guards/group-admin.guard';
import {authRoutesGuard} from './guards/auth-routes.guard';
import {getDraftSessionsByOwnerResolver} from './create-draft-session/resolver/get-draft-sessions-by-owner.resolver';
import {signInPageGuard} from './guards/sign-in-page.guard';
import {draftMetaResolver} from './fantasy/resolvers/draft-meta.resolver';
import {fantasyAllUsersPicksResolver} from './fantasy/resolvers/fantasy-all-users-picks.resolver';
import {exitFormGuard} from './guards/exit-form.guard';
import {unsavedTeamsGuard} from './team-builder/unsaved-teams.guard';
import {exitFantasyDraftGuard} from './fantasy/guards/exit-fantasy-draft.guard';
import {adminControlGuard} from './guards/admin-control.guard';
import {inactivePlayersResolver} from './manage-players/resolvers/inactive-players.resolver';
import {getSpecificGroupPlayersResolver} from './resolvers/get-specific-group-players.resolver';
import {groupOwnerGuard} from './guards/group-owner.guard';
import {superAdminGuard} from './guards/super-admin.guard';
import {groupMemberGuard} from './guards/group-member.guard';
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
    // Plain /home -> last used group, or the group picker.
    path: 'home',
    pathMatch: 'full',
    canActivate: [lastGroupRedirectGuard],
    children: [],
  },
  {
    // The group id is always in the URL, so every page link is shareable.
    path: 'home/:groupId',
    component: MainPageComponent,
    canActivate: [selectedGroupGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [groupHomeRedirectGuard],
        children: [],
      },
      {
        path: 'game',
        component: GameComponent,
        canActivate: [groupAdminGuard],
        canDeactivate: [exitFormGuard],
        data: { breadcrumb: 'Game' },
      },
      {
        // Everyone in the group can see the teams; only admins can change them.
        path: 'teams',
        loadComponent: () => import('./team-builder/team-builder.component').then(m => m.TeamBuilderComponent),
        canDeactivate: [unsavedTeamsGuard],
        data: { breadcrumb: 'Teams' },
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
            path: 'players',
            loadComponent: () => import('./statistics/player-stats/player-stats.component').then(m => m.PlayerStatsComponent),
            resolve: { inactivePlayers: inactivePlayersResolver },
            data: { breadcrumb: 'Players' },
          },
          {
            path: 'leaders',
            loadComponent: () => import('./statistics/leaders/leaders.component').then(m => m.LeadersComponent),
            resolve: { inactivePlayers: inactivePlayersResolver },
            data: { breadcrumb: 'Leaders' },
          },
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
        data: { breadcrumb: 'Manage Players' },
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
            children: [
              {
                path: '',
                pathMatch: 'full',
                redirectTo: 'edit-player',
              },
              {
                path: 'edit-player',
                loadComponent: () => import('./manage-players/edit-player/edit-player.component').then(m => m.EditPlayerComponent),
                canActivate: [groupAdminGuard, adminControlGuard],
                canDeactivate: [exitFormGuard],
                data: { breadcrumb: 'Edit Player' },
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
            canActivate: [groupMemberGuard],
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
        path: 'manage-group',
        loadComponent: () => import('./manage-group/manage-group.component').then(m => m.ManageGroupComponent),
        canActivate: [groupAdminGuard],
        data: { breadcrumb: 'Manage Group' },
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
    path: 'group-not-found',
    loadComponent: () => import('./group-not-found/group-not-found.component').then(m => m.GroupNotFoundComponent),
  },
  {
    path: 'reveal',
    loadComponent: () => import('./reveal/reveal.component').then(m => m.RevealComponent),
  },
];
