import {computed, inject, Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {Router} from '@angular/router';
import {Player, Statistics} from '../players/models/player.model';
import {PlayersService} from '../players/players.service';
import {GameDetails, GameStatus, MatchEventsManagerService} from '../match-event-manager/services/match-events-manager.service';
import {NavigationService} from '../shared/navigation/navigation.service';
import {ComputedStatisticsService} from '../statistics/services/computed-statistics.service';
import {computeTeamScores} from '../utils/team-scores.utils';
import {RevealApiService, RevealTeam, RevealSnapshot, PositionedPlayer, Position} from '../reveal/reveal-api.service';
import {formatTeamLabel} from '../utils/team-label.util';
import {PopupsService} from 'ui';

@Injectable()
export class GameService {

  playersService = inject(PlayersService);
  matchEventsService = inject(MatchEventsManagerService);
  navigationService = inject(NavigationService);
  computedStatsService = inject(ComputedStatisticsService);
  private revealApi = inject(RevealApiService);
  private popupsService = inject(PopupsService);
  private router = inject(Router);

  computedStats = computed(() => this.computedStatsService.statsMap())

  async revealTeams() {
    const groupId = this.playersService.selectedGroup()?.id;
    if (!groupId) return;
    await Promise.all([
      this.playersService.savePlayers(undefined, true),
      this.revealApi.saveSnapshot(groupId, this.buildSnapshot()),
    ]);
    const revealUrl = `${window.location.origin}/reveal?groupId=${groupId}`;
    await navigator.clipboard.writeText(revealUrl);
    this.popupsService.addSuccessPopOut('Link copied to clipboard!');
    this.router.navigate(['/reveal'], { queryParams: { groupId } });
  }

  async endGame(teams: any, slot = 1) {
    let team1Score = 0;
    let team2Score = 0;
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.matchEventsService.liveMatchIdFor(slot);
    if (groupId && matchId) {
      try {
        const eventsObservable = (this.matchEventsService as any).matchEventsApiService.getEvents(groupId, matchId);
        const events = (await firstValueFrom(eventsObservable)) as any[];
        events.forEach((ev: any) => {
          if (ev.type === 'player_goal' && !ev.deletedAt) {
            if (ev.teamKey === teams.team1) team1Score++;
            if (ev.teamKey === teams.team2) team2Score++;
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    let gameStatus: GameStatus = GameStatus.Decided;
    let winner = '';
    let loser = '';
    let wonTeamScore = 0;
    let loseTeamScore = 0;

    if (team1Score > team2Score) {
      winner = teams.team1;
      loser = teams.team2;
      wonTeamScore = team1Score;
      loseTeamScore = team2Score;
    } else if (team2Score > team1Score) {
      winner = teams.team2;
      loser = teams.team1;
      wonTeamScore = team2Score;
      loseTeamScore = team1Score;
    } else {
      gameStatus = GameStatus.Draw;
      winner = teams.team1;
      loser = teams.team2;
      wonTeamScore = team1Score;
      loseTeamScore = team2Score;
    }

    const gameDetails: GameDetails = {gameStatus, winner, loser, wonTeamScore, loseTeamScore};

    await this.matchEventsService.endGameAndPersist(gameDetails, slot);

    // Only tear down shared state once no game (single or league slot) is still live.
    if (!this.matchEventsService.hasAnyLiveMatch()) {
      await this.playersService.setFantasyMetaIsActive(false);
      this.navigationService.unlockNavigation();
    }
  }

  private buildSnapshot(): RevealSnapshot {
    const rawTeams = this.playersService.getTeams();
    const statsMap = this.computedStatsService.statsMap();
    const scores   = computeTeamScores(rawTeams, statsMap);

    const aliases = this.playersService.teamAliases();
    const teams: RevealTeam[] = Object.entries(rawTeams)
      .filter(([key, team]: [string, any]) => key !== 'allPlayers' && team.players.length > 0)
      .map(([key, team]: [string, any]) => ({
        name:         formatTeamLabel(key, aliases[key]),
        rating:       this.averageRating(team.players),
        attackScore:  scores[key]?.attackScore  ?? 0,
        defenseScore: scores[key]?.defenseScore ?? 0,
        players:      this.assignPositions(team.players as Player[], statsMap),
      }));

    return { teams, savedAt: null };
  }

  private assignPositions(players: Player[], statsMap: Map<string, Map<string, Statistics>>): PositionedPlayer[] {
    const scored = players.map(p => {
      const dateMap = statsMap.get(p.id);
      let goals = 0, conceded = 0, games = 0;
      for (const s of (dateMap?.values() ?? [])) {
        goals    += s.goals         ?? 0;
        conceded += s.goalsConceded ?? 0;
        games    += s.games         ?? 0;
      }
      const atk = games > 0 ? goals    / games : 0;
      const def = games > 0 ? conceded / games : 0;
      return { name: p.name, score: atk - def };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.map((sp, i) => ({ name: sp.name, position: this.positionByIndex(i, scored.length) }));
  }

  private positionByIndex(index: number, total: number): Position {
    const third = total / 3;
    if (index < third)     return 'DEF';
    if (index < 2 * third) return 'MID';
    return 'FWD';
  }

  private averageRating(players: Player[]): number {
    if (!players.length) return 0;
    return Math.round(players.reduce((sum, p) => sum + (p.rating || 0), 0) / players.length);
  }
}
