import { computed, inject, Injectable, signal } from '@angular/core';
import { PlayersService } from '../../players/players.service';
import { AdminControlService } from '../../user/admin-control.service';
import { MatchEventsManagerService } from '../../match-event-manager/services/match-events-manager.service';
import { NavigationService } from '../../shared/navigation/navigation.service';
import { GameService } from '../game.service';
import { Player } from '../../players/models/player.model';

/**
 * All state and side effects for the classic single-match view. The component
 * keeps only what needs the DOM (the stopwatch `viewChild`).
 */
@Injectable()
export class SingleGameService {
  private playersService = inject(PlayersService);
  private adminControl = inject(AdminControlService);
  private matchEvents = inject(MatchEventsManagerService);
  private navigationService = inject(NavigationService);
  private gameService = inject(GameService);

  /** Board move-lock: set once a game starts, also toggled manually via the lock button. */
  readonly isMovePlayersLocked = signal(false);
  /** The (up to two) team keys picked to play. */
  readonly playingTeams = signal<string[]>([]);

  readonly lockIcon = computed(() =>
    this.isMovePlayersLocked() ? 'assets/icons/unlock.svg' : 'assets/icons/lock.svg'
  );

  // --- Board view: everything the template used to pull from other services ---
  readonly teams = computed(() => this.playersService.getTeams());
  readonly numberOfTeams = this.playersService.numberOfTeams;
  readonly playerStatsMap = this.gameService.computedStats;
  readonly liveMatchId = this.matchEvents.liveMatchId;
  readonly showRating = computed(() => this.adminControl.getAdminControl().showRating);
  readonly showMakeBalancedTeams = computed(() => this.adminControl.getAdminControl().showMakeBalanceTeams);
  readonly isAdmin = computed(() => this.playersService.isAdmin());
  readonly teamAliases = computed(() => this.playersService.teamAliases());

  toggleMovePlayersLock(): void {
    this.isMovePlayersLocked.set(!this.isMovePlayersLocked());
  }

  setPlayingTeams(teamKeys: string[]): void {
    this.playingTeams.set(teamKeys);
  }

  updateTeams(teams: any): void {
    this.playersService.setTeams(teams);
  }

  renameTeam(teamKey: string, alias: string): void {
    void this.playersService.setTeamAlias(teamKey, alias);
  }

  revealTeams(): void {
    void this.gameService.revealTeams();
  }

  onTimerStart(): void {
    if (this.playingTeams().length !== 2) return;
    this.isMovePlayersLocked.set(true);
    this.navigationService.lockNavigation();
    void this.matchEvents.onTimerStartedForMatch();
  }

  onTimerReset(): void {
    void this.matchEvents.abandonLiveMatchOnReset();
    this.isMovePlayersLocked.set(false);
    this.navigationService.unlockNavigation();
  }

  /** End the live game for the two playing teams. Returns false if fewer than two are picked. */
  async endGame(): Promise<boolean> {
    const [team1, team2] = this.playingTeams();
    if (!team1 || !team2) return false;
    await this.gameService.endGame({ team1, team2 });
    this.isMovePlayersLocked.set(false);
    this.playingTeams.set([]);
    return true;
  }

  recordGoal(goal: { player: Player; teamKey: string }, elapsedMs: number): void {
    void this.matchEvents.recordPlayerGoalFromTimer(goal.player, goal.teamKey, elapsedMs);
  }
}
