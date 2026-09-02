import {computed, inject, signal} from '@angular/core';
import {GridRow} from 'ui';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {StatisticsService} from '../../statistics/services/statistics.service';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';

export class PlayersStatisticsTableService {

  statisticsService = inject(StatisticsService);
  playersService = inject(PlayersService);
  private computedStatsService = inject(ComputedStatisticsService);

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
    const date = this.statisticsService.getSelectedDate();
    const statsMap = this.computedStatsService.statsMap();
    if (date === this.statisticsService.selectAllLabel()) {
      return this.setOverallStatisticsData(statsMap);
    } else {
      let maxGoals = -1;
      const dataByDate = this.playersService.flattenPlayers().map((player: Player) => {
        const stats = statsMap.get(player.id)?.get(date);
        if (stats && stats.games > 0) {
          const goals = stats.goals || 0;
          if (goals > maxGoals) maxGoals = goals;
          return {
            name: {value: player.name},
            goals: {value: goals},
            wins: {value: stats.wins || 0},
            games: {value: stats.games || 0}
          };
        }
        return null;
      }).filter(Boolean);
      return this.addPlayerWinnerIcon(dataByDate, maxGoals) as GridRow[];
    }
  })
  actions = signal([])
  config = signal({
    numberOfColumns: 4
  })

  setOverallStatisticsData(statsMap: Map<string, Map<string, import('../../players/models/player.model').Statistics>>) {
    let maxGoals = -1;
    const rows = this.playersService.flattenPlayers().map((player: Player) => {
      const playerMap = statsMap.get(player.id);
      if (!playerMap) return null;
      let goals = 0, wins = 0, games = 0;
      for (const stats of playerMap.values()) {
        if ((stats.games || 0) > 0) {
          goals += stats.goals || 0;
          wins += stats.wins || 0;
          games += stats.games || 0;
        }
      }
      if (games === 0) return null;
      if (goals > maxGoals) maxGoals = goals;
      return {name: {value: player.name}, goals: {value: goals}, wins: {value: wins}, games: {value: games}};
    }).filter(Boolean);
    return this.addPlayerWinnerIcon(rows, maxGoals) as GridRow[];
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
