import {Component, inject, OnInit, signal} from '@angular/core';
import {GridComponent, GridRow} from 'ui';
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
export class StatisticsComponent implements OnInit {

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

  dataRows = signal([] as GridRow[])
  actions = signal([])
  config = signal({
    numberOfColumns: 4
  })

  overAllStatistics: (GridRow | null)[] | null = null;

  setOverallStatisticsData() {
    if(!this.overAllStatistics) {

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
    this.dataRows.set(this.addPlayerWinnerIcon(this.overAllStatistics, maxGoals) as GridRow[])
    }
  }

  ngOnInit(): void {
    this.setOverallStatisticsData();
    this.getAllStatisticsDateOptions();
  }

  addPlayerWinnerIcon(stats: (GridRow | null)[], maxGoals: number) {
    return stats.map((playerStat) => {
      if (!playerStat) {
        return null;
      }
      if(playerStat['goals'].value === maxGoals) {
        return {...playerStat, name: {value: `👑 ${playerStat['name'].value}`}};
      }
      return playerStat;
    })
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
        this.dataRows.set(this.addPlayerWinnerIcon(dataByDate, maxGoals) as GridRow[]);
    }
  }
}
