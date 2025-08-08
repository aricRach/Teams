import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {FantasyApiService, FantasyData} from './fantasy-api.service';
import {SpinnerService} from '../../spinner.service';

@Injectable()
export class FantasyAnalyticsService {

  playersService = inject(PlayersService);
  spinnerService = inject(SpinnerService);
  fantasyApiService = inject(FantasyApiService);

  allUniqueDates = signal([] as string[]);
  selectAllLabel = signal('Select All');
  selectedDate = signal(this.selectAllLabel());
  allFantasyData = signal<any>({});
  constructor() {
    this.getAllFantasyDates();
  }

  columns = signal([
    { alias: 'name', property: 'name', isFilterDisabled: false, isSortDisabled: false},
    { alias: 'points', property: 'points', isFilterDisabled: false, isSortDisabled: false},
    { alias: 'description', property: 'description', isFilterDisabled: true, isSortDisabled: true}
  ])

  dataRows = computed(() => {
      return this.tableData().map((fantasyData: any) => {
        return {
          name: {value: fantasyData.name},
          points: {value: fantasyData.points},
          description: {value: fantasyData.description}
        }
      });
  })
  config = signal({
    numberOfColumns: 3
  })

  tableData = computed(() => {
    const date = this.selectedDate();
    if(date === 'Select All') return []
    const allActivePlayersInDateMap = new Map(
      this.playersService.flattenPlayers(this.playersService.getTeams())
        .filter((p) => !!p.statistics[date]).map(player => {
        const stats = player.statistics[date];
        let points = stats.goals * 3 + stats.wins * 2;
        if (stats.goalsConceded < 5) points += 3;
        return [player.id, { playerName: player.name, points }];
      })
    );

    return this.allFantasyData()[this.selectedDate()].userPicks.map((userPicks: {
      captain: string,
      playerIds: string[],
      userName: string
    }) => {
      let points = 0;
      const pickDescriptions: string[] = [];

      userPicks.playerIds.forEach((id) => {
        const fantasyPlayer = allActivePlayersInDateMap.get(id);
        if (id !== userPicks.captain) {
          points += allActivePlayersInDateMap.get(id)?.points || 0;
          if (fantasyPlayer) {
            pickDescriptions.push(`${fantasyPlayer.playerName}->${fantasyPlayer.points}`);
          }
        } else {
          points = points + (allActivePlayersInDateMap.get(id)?.points || 0) * 2;
          if (fantasyPlayer) {
            pickDescriptions.push(`${fantasyPlayer.playerName}(C)->${(fantasyPlayer.points * 2)}`);
          }
        }
      })
      return {name: userPicks.userName, points, description: pickDescriptions.join(', ')};
    })
  })

  getAllFantasyDates() {
      this.spinnerService.setIsLoading(true);
      this.fantasyApiService.getAllFantasyDataWithUserPicks(this.playersService.selectedGroup().id).then((fantasyData) => {
        console.log(fantasyData)
        // @ts-ignore
        this.setAllFantasyDates(fantasyData);
        this.allFantasyData.set(fantasyData);
      })
        .finally(() => this.spinnerService.setIsLoading(false))

  }

  setAllFantasyDates(fantasyData: FantasyData[]) {
    const fantasyDates = new Set(Object.keys(fantasyData).filter((key) => key !== 'meta'));
    this.allUniqueDates.set(
      [this.selectAllLabel(), ...Array.from(new Set(
        this.playersService.flattenPlayers()
          .flatMap(player =>
            Object.entries(player.statistics)
              .filter(([_, stats]) => stats.games > 0)
              .map(([date, _]) => date)
              .filter(date => fantasyDates.has(date))
          ).sort((d1, d2) =>
          d1.split('-').reverse().join('').localeCompare(d2.split('-').reverse().join(''))
        )
      ))]
    );
  }

  setSelectedDate(event: Event) {
    const date = (event.target as HTMLSelectElement).value;
    this.selectedDate.set(date);
  }
}
