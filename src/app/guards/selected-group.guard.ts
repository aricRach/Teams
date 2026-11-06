import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {Auth} from '@angular/fire/auth';
import {LAST_GROUP_ID_KEY, PlayersService} from '../players/players.service';
import {PlayersApiService} from '../players/players-api.service';

/**
 * Guards /home/:groupId. The group always comes from the URL, so every URL is shareable.
 * Any signed-in user can view a group by id (non-members get read-only access).
 */
export const selectedGroupGuard: CanActivateFn = async (route, state) => {
  const playersService = inject(PlayersService);
  const playersApiService = inject(PlayersApiService);
  const router = inject(Router);
  const auth = inject(Auth);

  const groupId = route.paramMap.get('groupId')!;

  if (playersService.selectedGroup()?.id === groupId) {
    return true;
  }

  const email = auth.currentUser?.email;
  if (!email) {
    localStorage.setItem('redirectTo', state.url);
    return router.createUrlTree(['/']);
  }

  let group = null;
  try {
    group = await playersApiService.getGroupById(groupId);
  } catch {
    group = null;
  }

  if (!group) {
    try {
      if (localStorage.getItem(LAST_GROUP_ID_KEY) === groupId) localStorage.removeItem(LAST_GROUP_ID_KEY);
    } catch {}
    return router.createUrlTree(['/group-not-found']);
  }

  playersService.selectGroup(group, email);
  return true;
};

/** Plain /home (no group id): go to the selected or last used group, otherwise the group picker. */
export const lastGroupRedirectGuard: CanActivateFn = () => {
  const playersService = inject(PlayersService);
  let groupId = playersService.selectedGroup()?.id;
  if (!groupId) {
    try {
      groupId = localStorage.getItem(LAST_GROUP_ID_KEY);
    } catch {}
  }
  return inject(Router).createUrlTree(groupId ? ['/home', groupId] : ['/select-group']);
};
