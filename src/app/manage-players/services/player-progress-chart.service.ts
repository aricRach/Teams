import {computed, inject, Injectable, linkedSignal, signal} from '@angular/core';
import {ChartData, ChartDataset, ChartOptions} from 'chart.js';
import {PlayersService} from '../../players/players.service';
import {Player} from '../../players/models/player.model';
import {ManagePlayersService} from './manage-players.service';

export enum ViewMode{
  WIN = 'win',
  GOALS = 'goals'
}
@Injectable()
export class PlayerProgressChartService {
  managePlayersService = inject(ManagePlayersService);
  playersService = inject(PlayersService);
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
  selectedPlayerOption = '';
  isCompareMode = false;

  compareWithPlayerOptions = computed(() => {
    return [...this.playersService.flattenPlayers(this.playersService.computedTeams()).filter((p: Player) => p.name !== this.managePlayersService.selectedPlayer()?.name)];
  });
  compareWithPlayer = linkedSignal<any>(() => {
    debugger
    return this.compareWithPlayerOptions().filter((p => p.name === this.selectedPlayerOption))[0] || null;
  });
  onChangePlayer() {
    debugger
    this.compareWithPlayer.set(this.compareWithPlayerOptions().filter((p => p.name === this.selectedPlayerOption))[0]);
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
      const data = Object.entries(p.statistics)
        .filter(([_, stats]) => Object.keys(stats).length > 0 && stats.games > 0)
        .map(([dateStr, stats]) => {
          const [day, month, year] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return {
            x: date,
            y: stats[statType] ?? 0,
          };
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
    this.selectedPlayerOption = '';
    this.compareWithPlayer.set(null);
  }
}
