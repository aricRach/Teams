import {computed, inject, signal} from '@angular/core';
import {GridRow} from 'ui';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {StatisticsService} from '../../statistics/services/statistics.service';

export class PlayersStatisticsTableService {

  statisticsService = inject(StatisticsService);
  playersService = inject(PlayersService);

  columns = signal([
    {
      alias: 'name',
      property: 'name',
      isFilterDisabled: false,
      isSortDisabled: false
    },
    {
      alias: 'goals',
      property: 'goals',
      isFilterDisabled: false,
      isSortDisabled: false
    },
    {
      alias: 'wins',
      property: 'wins',
      isFilterDisabled: false,
      isSortDisabled: false
    },
    {
      alias: 'games',
      property: 'games',
      isFilterDisabled: false,
      isSortDisabled: false
    },
  ])

  dataRows = computed(() => {
    const date = this.statisticsService.getSelectedDate()
    if(date === this.statisticsService.selectAllLabel()) {
      return this.setOverallStatisticsData();
    } else {
      let maxGoals = -1;
      const dataByDate = this.playersService.flattenPlayers().map((player: Player) => {
        if(player.statistics[date] && player.statistics[date].games > 0) {
          const name = player.name;
          const goals = player.statistics[date].goals;
          const wins = player.statistics[date].wins
          const games = player.statistics[date].games;
          if (goals > maxGoals) {
            maxGoals = goals;
          }
          return {
            name: {value: name},
            goals: { value: goals },
            wins: { value: wins },
            games: { value: games },
          }
        }
        return null;
      })
        .filter(Boolean);
      return this.addPlayerWinnerIcon(dataByDate, maxGoals) as GridRow[];
    }
  })
  actions = signal([])
  config = signal({
    numberOfColumns: 4
  })

  overAllStatistics: (GridRow | null)[] | null = null;

  setOverallStatisticsData() {
    let maxGoals = -1;
    this.overAllStatistics = this.playersService.flattenPlayers()
      .map((player: Player) => {
        const {goals, games, hasPlayed, wins} = Object.values(player.statistics).reduce(
          (acc, stat) => {
            if (stat.games > 0) {
              acc.hasPlayed = true;
              acc.goals += stat.goals;
              acc.wins += stat.wins;
              acc.games += stat.games;
            }
            return acc;
          },
          {
            hasPlayed: false, goals: 0, wins: 0, games: 0,
          }
        );
        if (goals > maxGoals) {
          maxGoals = goals;
        }
        return hasPlayed
          ? {
            name: {value: player.name}, //
            goals: {value: goals},
            wins: {value: wins},
            games: {value: games},
          }
          : null;
      })
      .filter(Boolean)
    return this.addPlayerWinnerIcon(this.overAllStatistics, maxGoals) as GridRow[];
  }

  addPlayerWinnerIcon(stats: (GridRow | null)[], maxGoals: number) {
    return stats.map((playerStat) => {
      if (!playerStat) {
        return null;
      }
      if(playerStat['goals'].value === maxGoals && maxGoals > 0) {
        return {...playerStat, name: {value: `${playerStat['name'].value} 👑`}};
      }
      return playerStat;
    })
  }
}
