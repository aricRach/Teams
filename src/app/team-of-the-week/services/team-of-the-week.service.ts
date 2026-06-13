import {computed, inject, Injectable, linkedSignal, resource} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {TeamOfTheWeekApiService} from './team-of-the-week-api.service';
import {StatisticsService} from '../../statistics/services/statistics.service';
import {ModalsService, PopupsService} from 'ui';
import {SpinnerService} from '../../spinner.service';
import {shuffleArray} from '../../utils/array-utils';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';


export interface PlayerWeekStates {
  name: string,
  totalGoals: number,
  totalGames: number,
  totalWins: number,
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

  totwResource = resource({
    params: () => ({
      date: this.statisticService.getSelectedDate()
    }),
    loader: ({ params }) =>
      this.getTeamOfTheWeek(params.date)
  });

  totwData = linkedSignal(() => this.totwResource.value());

  shouldShowReGenerate = computed(() => this.playersService.isAdmin() && this.statisticService.getSelectedDate() !== this.statisticService.selectAllLabel())

  reGenerateDisabledReason = computed<string | null>(() => {
    const data = this.totwData();
    if (!data) return null;
    const totalTries: number = data['totalTries'] ?? 0;
    const lastGeneratedDay: string | null = data['lastGeneratedDay'] ?? null;
    const today = new Date().toISOString().slice(0, 10);
    if (totalTries >= 5) return 'Max 5 generates reached for this date';
    if (lastGeneratedDay === today) return 'Already regenerated today';
    return null;
  });

  calculateWeekStates(date: string) {
    const allPlayers = this.playersService.flattenPlayers();
    const statsMap = this.computedStatsService.statsMap();
    const setOfTeams = new Set<string>();
    const players = allPlayers
      .filter(player => {
        const s = statsMap.get(player.id)?.get(date);
        return s && s.games > 0;
      })
      .map(player => {
        const s = statsMap.get(player.id)!.get(date)!;
        setOfTeams.add(player.team);
        return {name: player.name, team: player.team, totalGoals: s.goals, totalGames: s.games, totalWins: s.wins, totalGoalsConceded: s.goalsConceded};
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
        this.spinnerService.setIsLoading(true);
        const weekStates = this.calculateWeekStates(date);
        this.teamOfTheWeekApiService.generateAiTotw(date, shuffleArray(weekStates.players), weekStates.teamSize, true).then(data => {
          this.totwData.set(data)
        }).catch((e) => {
          console.error(e)
        }).finally(() => {
          this.spinnerService.setIsLoading(false)
        });
      }
    })

  }
}
