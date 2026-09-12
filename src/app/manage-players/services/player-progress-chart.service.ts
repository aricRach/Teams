import {computed, inject, Injectable, signal} from '@angular/core';
import {ChartData, ChartDataset, ChartOptions} from 'chart.js';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {ManagePlayersService} from './manage-players.service';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';
import {AutoCompleteOption} from 'ui';

export enum ViewMode{
  WIN = 'win',
  GOALS = 'goals'
}
@Injectable()
export class PlayerProgressChartService {
  managePlayersService = inject(ManagePlayersService);
  playersService = inject(PlayersService);
  private computedStatsService = inject(ComputedStatisticsService);
  statToShow = signal<'goals' | 'wins'>('goals');
  lineChartOptions = computed((): ChartOptions<'line'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'dd-MM-yyyy',
            displayFormats: {
              day: 'MMM d',
            },
          },
          ticks: {
            display: !this.compareWithPlayer(),
            autoSkip: true,
            maxRotation: 45,
            minRotation: 0,
            source: 'data',
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        },
      },
      plugins: {
        legend: {
          display: true,
        },
      },
    };
  });

  lineChartLegend = true;
  isCompareMode = false;

  compareWithPlayerOptions = computed(() => {
    return [...this.playersService.flattenPlayers().filter((p: Player) => p.name !== this.managePlayersService.selectedPlayer()?.name)];
  });
  compareWithPlayerAutoCompleteOptions = computed(() => {
    return this.compareWithPlayerOptions().map((p: Player) => ({value: p.id, alias: p.name}));
  });
  compareWithPlayer = signal<Player | null>(null);

  onChangeComparePlayer(option: AutoCompleteOption) {
    this.compareWithPlayer.set(this.compareWithPlayerOptions().find(p => p.id === option.value) ?? null);
  }

  removeComparePlayer() {
    this.compareWithPlayer.set(null);
  }

  lineChartData = computed((): ChartData<'line', { x: Date; y: number }[]> => {
    const player = this.managePlayersService.selectedPlayer() as Player;
    if (!player) {
      return {} as ChartData<'line', { x: Date; y: number }[]>;
    }

    const statType = this.statToShow();
    const comparedPlayer = this.compareWithPlayer();

    const players = comparedPlayer ? [player, comparedPlayer as Player] : [player];
    const colors = ['blue', 'green'];
    const datasets = players.map((p, i) => {
      const playerStats = this.computedStatsService.statsForPlayer(p.id);
      const data = Array.from(playerStats.entries())
        .filter(([_, stats]) => stats.games > 0)
        .map(([dateStr, stats]) => {
          const [day, month, year] = dateStr.split('-').map(Number);
          return {x: new Date(year, month - 1, day), y: stats[statType] ?? 0};
        })
        .sort((a, b) => a.x.getTime() - b.x.getTime())
        .slice(-9);

      return {
        label: `${p.name} - ${statType}`,
        data,
        borderColor: colors[i % colors.length],
        fill: false,
      } satisfies ChartDataset<'line', { x: Date; y: number }[]>;
    });

    return {
      datasets,
    };
  });

  toggleStat(stat: 'goals' | 'wins') {
    this.statToShow.set(stat);
  }

  compareModeToggle() {
    this.compareWithPlayer.set(null);
  }
}
