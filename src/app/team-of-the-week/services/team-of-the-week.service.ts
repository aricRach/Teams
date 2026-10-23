import {computed, inject, Injectable, linkedSignal, resource} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {TeamOfTheWeekApiService, TOTW_MAX_DAILY_GENERATES, TOTW_MAX_TOTAL_GENERATES} from './team-of-the-week-api.service';
import {StatisticsService} from '../../statistics/services/statistics.service';
import {ModalsService, PopupsService} from 'ui';
import {SpinnerService} from '../../spinner.service';
import {shuffleArray} from '../../utils/array-utils';
import {createMutation} from '../../shared/optimistic/run-optimistic';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';


export interface PlayerWeekStates {
  name: string,
  totalGoals: number,
  totalGames: number,
  totalWins: number,
  totalGoalsConceded: number,
  totalOwnGoals: number,
  team: string
}

@Injectable({
  providedIn: 'root'
})
export class TeamOfTheWeekService {

  playersService = inject(PlayersService);
  statisticService = inject(StatisticsService);
  teamOfTheWeekApiService = inject(TeamOfTheWeekApiService);
  popupsService = inject(PopupsService);
  spinnerService = inject(SpinnerService);
  modalsService = inject(ModalsService);
  private computedStatsService = inject(ComputedStatisticsService);
  readonly regenerate = createMutation({
    run: (date: string, players: any[], teamSize: number) =>
      this.teamOfTheWeekApiService.generateAiTotw(date, players, teamSize, true),
    onSuccess: (data) => this.totwData.set(data),
    onError: () => this.popupsService.addErrorPopOut("Couldn't regenerate the team of the week, please try again."),
  });

  totwResource = resource({
    params: () => ({
      date: this.statisticService.getSelectedDate()
    }),
    loader: ({ params }) =>
      this.getTeamOfTheWeek(params.date)
  });

  // value() throws while the resource is in an error state, so only read it when there is one.
  totwData = linkedSignal(() => this.totwResource.hasValue() ? this.totwResource.value() : undefined);

  shouldShowReGenerate = computed(() => this.playersService.isAdmin() && this.statisticService.getSelectedDate() !== this.statisticService.selectAllLabel())

  reGenerateDisabledReason = computed<string | null>(() => {
    const data = this.totwData();
    if (!data) return null;
    const totalTries: number = data['totalTries'] ?? 0;
    const lastGeneratedDay: string | null = data['lastGeneratedDay'] ?? null;
    const today = new Date().toISOString().slice(0, 10);
    const dailyTries: number = lastGeneratedDay === today ? (data['dailyTries'] ?? 0) : 0;
    if (totalTries >= TOTW_MAX_TOTAL_GENERATES) return `Max ${TOTW_MAX_TOTAL_GENERATES} generates reached for this date`;
    if (dailyTries >= TOTW_MAX_DAILY_GENERATES) return `Max ${TOTW_MAX_DAILY_GENERATES} generates reached for today`;
    return null;
  });

  calculateWeekStates(date: string) {
    const allPlayers = this.playersService.flattenPlayers(true, false);
    const statsMap = this.computedStatsService.statsMap();
    const setOfTeams = new Set<string>();
    const players: PlayerWeekStates[] = allPlayers
      .filter(player => {
        const s = statsMap.get(player.id)?.get(date);
        return s && s.games > 0;
      })
      .map(player => {
        const s = statsMap.get(player.id)!.get(date)!;
        setOfTeams.add(player.team);
        return {name: player.name, team: player.team, totalGoals: s.goals, totalGames: s.games, totalWins: s.wins, totalGoalsConceded: s.goalsConceded, totalOwnGoals: s.ownGoals};
      });
    return {players, teamSize: Math.ceil(players.length / setOfTeams.size)};
  }

  getTeamOfTheWeek(date: string) {
    if(date  === this.statisticService.selectAllLabel()) {
      this.popupsService.addErrorPopOut('Please select a specific date');
      return Promise.resolve(null);
    } else {
      this.spinnerService.setIsLoading(true);
      const weekStates = this.calculateWeekStates(date);
      return this.teamOfTheWeekApiService.generateAiTotw(date, weekStates.players, weekStates.teamSize).finally(() => {
        this.spinnerService.setIsLoading(false)
      });
    }
  }

  reGenerateTeamOfTheWeek() {
    this.modalsService.openConfirmModal({
      title: 'ReGenerate Team',
      description: `By confirm you will regenerate team of the week.<br>current selection will be changed.`,
    }).afterClosed().subscribe((confirm) => {
      if(confirm) {
        const date = this.statisticService.getSelectedDate();
        const weekStates = this.calculateWeekStates(date);
        void this.regenerate.run(date, shuffleArray(weekStates.players), weekStates.teamSize);
      }
    })

  }
}
