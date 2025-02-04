import {Component, inject, OnInit, signal} from '@angular/core';
import {GridComponent, GridRow} from '../../../../ui-elements/dist/ui';
import {PlayersService} from '../players/players.service';
import {Player} from '../players/models/player.model';


@Component({
  selector: 'app-statistics',
  imports: [
    GridComponent,
  ],
  templateUrl: './statistics.component.html',
  standalone: true,
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements OnInit{

  playersService = inject(PlayersService);

  selectAllLabel = signal('Select All')
  allUniqueDates = signal([] as string[]);
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
      alias: 'games',
      property: 'games',
      isFilterDisabled: false,
      isSortDisabled: false
    }
  ])

  dataRows = signal([] as GridRow[])
  actions = signal([])
  config = signal({
    numberOfColumns: 3
  })

  overAllStatistics: (GridRow | null)[] = [];


  setOverallStatisticsData() {
    if(!this.overAllStatistics) {
    this.overAllStatistics = this.playersService.flattenPlayers()
      .map((player: Player) => {
        const { goals, games, hasPlayed } = Object.values(player.statistics).reduce(
          (acc, stat) => {
            if (stat.games > 0) {
              acc.hasPlayed = true;
              acc.goals += stat.goals;
              acc.games += stat.games;
            }
            return acc;
          },
          { hasPlayed: false, goals: 0, games: 0 }
        );
        return hasPlayed
          ? {
            name: { value: player.name },
            goals: { value: goals },
            games: { value: games }
          }
          : null;
      })
      .filter(Boolean);
    }
    this.dataRows.set(this.overAllStatistics as GridRow[])
  }
  ngOnInit(): void {
    this.setOverallStatisticsData();
    this.getAllStatisticsDateOptions();
  }

  private getAllStatisticsDateOptions() {
    this.allUniqueDates.set(
      [this.selectAllLabel(), ...Array.from(new Set(
        this.playersService.flattenPlayers()
          .flatMap(player =>
            Object.entries(player.statistics) // Convert to array of [date, stats]
              .filter(([_, stats]) => stats.games > 0) // Keep only dates where games > 0
              .map(([date, _]) => date) // Extract only the date
          )
      ))]
  );
  }

  onDateSelected(event: Event) {
    const date = (event.target as HTMLSelectElement).value;
    if(date === this.selectAllLabel()) {
      this.setOverallStatisticsData();
    } else {
        const dataByDate = this.playersService.flattenPlayers().map((player: Player) =>
          player.statistics[date] && player.statistics[date].games > 0 ? {
              name: {value: player.name},
              goals: { value: player.statistics[date].goals },
              games: { value: player.statistics[date].games },
            } : null
        ).filter(Boolean);
        this.dataRows.set(dataByDate as GridRow[]);
    }
  }
}
