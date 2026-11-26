import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ModalsService, PopupsService } from 'ui';
import { PlayersService } from '../players/players.service';
import { MatchEventsManagerService } from '../match-event-manager/services/match-events-manager.service';
import { NavigationService } from '../shared/navigation/navigation.service';
import { createMutation } from '../shared/optimistic/run-optimistic';
import { MatchRecord } from '../match-event-manager/models/match-event.model';
import { LiveMatchResumeApiService } from './live-match-resume-api.service';
import { sortLiveMatches } from './utils/resumable-matches.util';
import { describeLiveGames } from './utils/live-games-description.util';

/**
 * Games stay live in the DB when the page is refreshed mid-game. When a group opens, this asks
 * an admin to resume those games on this device or to discard them.
 */
@Injectable({
  providedIn: 'root'
})
export class LiveMatchResumeService {
  private liveMatchResumeApiService = inject(LiveMatchResumeApiService);
  private playersService = inject(PlayersService);
  private matchEventsService = inject(MatchEventsManagerService);
  private navigationService = inject(NavigationService);
  private modalsService = inject(ModalsService);
  private popupsService = inject(PopupsService);
  private router = inject(Router);

  // The group page and the game page both check when the app opens on the game page.
  private isChecking = false;

  private readonly discardMatches = createMutation({
    run: (groupId: string, matches: MatchRecord[]) =>
      Promise.all(matches.map(match => this.matchEventsService.abandonMatch(groupId, match.id!))),
    onError: () => this.popupsService.addErrorPopOut('Could not discard the live games, so they are still live.'),
  });

  // Nobody asked for this, so a failure needs no popup: the next check tries again.
  private readonly abandonLeftBehindMatches = createMutation({
    run: (groupId: string, matchIds: string[]) => this.liveMatchResumeApiService.markAbandoned(groupId, matchIds),
    onError: (error) => console.error('Failed to abandon left-behind live games:', error),
  });

  async checkForLiveMatches(): Promise<void> {
    const groupId = this.playersService.selectedGroup()?.id;
    // Games already running on this device need nothing.
    if (!groupId || !this.playersService.isAdmin() || this.isChecking || this.matchEventsService.hasAnyLiveMatch()) return;

    this.isChecking = true;
    try {
      const { resumable, stale } = sortLiveMatches(await this.liveMatchResumeApiService.getLiveMatches(groupId), new Date());
      // Not awaited: they can't be resumed anyway, so a failure here shouldn't hold up the popup.
      void this.abandonLeftBehindMatches.run(groupId, stale.map(match => match.id!));
      if (!resumable.length) return;

      const liveGames = await Promise.all(resumable.map(async match => ({
        match,
        events: await this.liveMatchResumeApiService.getEvents(groupId, match.id!)
      })));
      const shouldResume = await this.askToResume(describeLiveGames(liveGames, this.playersService.teamAliases(), this.matchEventsService.getActorId()), resumable.length);

      // The group changed or a game was started while the popup was open.
      if (this.playersService.selectedGroup()?.id !== groupId || this.matchEventsService.hasAnyLiveMatch()) return;
      if (shouldResume) {
        await this.resume(resumable);
      } else {
        await this.discardMatches.run(groupId, resumable);
      }
    } catch (error) {
      console.error('Failed to check for live games:', error);
    } finally {
      this.isChecking = false;
    }
  }

  private async resume(matches: MatchRecord[]): Promise<void> {
    this.matchEventsService.resumeLiveMatches(matches);
    // Another page's leave guard can cancel the move; the games stay resumed and the Game tab shows them.
    const openedGamePage = await this.router.navigateByUrl(this.playersService.groupUrl('game'));
    if (openedGamePage) this.navigationService.lockNavigation();
  }

  // There's no "later": closing the popup leads to the discard question, and cancelling that asks again.
  private async askToResume(gamesDescription: string, gameCount: number): Promise<boolean> {
    const liveGames = gameCount === 1 ? 'live game' : `${gameCount} live games`;
    while (true) {
      const resume = await firstValueFrom(this.modalsService.openConfirmModal({
        title: gameCount === 1 ? 'Live game in progress' : `${liveGames} in progress`,
        description: `${gamesDescription}<br><br>Resume to keep playing here, or cancel to discard.`,
        confirmBtn: 'resume',
      }).afterClosed());
      if (resume) return true;

      const discard = await firstValueFrom(this.modalsService.openConfirmModal({
        title: `Discard the ${liveGames}?`,
        description: 'Their goals are deleted and they are not counted.',
        confirmBtn: 'discard',
        danger: true,
      }).afterClosed());
      if (discard) return false;
    }
  }
}
