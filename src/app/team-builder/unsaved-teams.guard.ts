import {CanDeactivateFn} from '@angular/router';
import {inject} from '@angular/core';
import {map} from 'rxjs';
import {ModalsService} from 'ui';
import {PlayersService} from '../players/players.service';
import {MatchEventsManagerService} from '../match-event-manager/services/match-events-manager.service';

/** Leaving the Team Builder with unsaved team changes asks first, and undoes them if the user leaves. */
export const unsavedTeamsGuard: CanDeactivateFn<unknown> = () => {
  const playersService = inject(PlayersService);
  // While a game runs the builder is read-only, and undoing could move players of the running game.
  const isGameRunning = inject(MatchEventsManagerService).liveMode() !== null;
  // While a save runs, the teams aren't marked saved yet: undoing them would fight the save that's on its way.
  const isSaving = playersService.savePlayers.pending();
  if (!playersService.isAdmin() || isGameRunning || isSaving || !playersService.hasUnsavedTeams()) return true;

  return inject(ModalsService).openConfirmModal({
    title: 'Leave without saving?',
    confirmBtn: 'leave and undo changes',
    danger: true,
    description: 'The teams will go back to how they were at the last save.',
  }).afterClosed().pipe(map((result: string) => {
    if (!result) return false;
    playersService.discardUnsavedTeams();
    return true;
  }));
};
