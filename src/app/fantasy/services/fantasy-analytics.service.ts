import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {FantasyData, FantasyMeta} from './fantasy-api.service';
import {SpinnerService} from '../../spinner.service';
import {Player, Statistics} from '../../players/models/player.model';

@Injectable()
export class FantasyAnalyticsService {

  playersService = inject(PlayersService);
  spinnerService = inject(SpinnerService);

  allUniqueDates = signal([] as string[]);
  selectAllLabel = signal('Select All');
  selectedDate = signal(this.selectAllLabel());
  allFantasyData = signal<FantasyData>({});
  allPlayers = computed(() => {
    return [...this.playersService.flattenPlayers(), ...this.inactivePlayers()];
  });
  inactivePlayers = signal<Player[]>([]);
  fantasyMetaData = signal({} as FantasyMeta);

  columns = signal([
    { alias: 'name', property: 'name', isFilterDisabled: false, isSortDisabled: false},
    { alias: 'points', property: 'points', isFilterDisabled: false, isSortDisabled: false},
    { alias: 'description', property: 'description', isFilterDisabled: true, isSortDisabled: true}
  ])

  dataRows = computed(() => {
      return this.tableData().map((fantasyData) => {
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

  allPlayersPointsMap = computed(() => {
    const allPlayers = this.allPlayers();
    return new Map(
      allPlayers.flatMap((p) =>
        Object.entries(p.statistics).filter(([date, stats]: [string, Statistics]) => stats.games > 0).map(([date, stats]: [string, Statistics]) => {
          return [p.id + '_' + date, { playerName: p.name, points: this.calculatePoints(stats), date }];
        })
      )
    );
  })

   calculatePoints(stats: { goals: number; wins: number; goalsConceded: number }): number {
    let points = (stats.goals || 0) * 3 + (stats.wins || 0) * 2;
    if (stats.goalsConceded < 5) points += 3;
    return points;
  }

  processUserPicks(
    userPicks: { userId: string; captain: string; playerIds: string[]; userName: string },
    date: string,
    playersMap: Map<string, { playerName: string; points: number; date: string }>,
    allDatesMode = false
  ): { points: number; descriptions: string[]; rawPlayerPoints?: Map<string, number> } {
    let points = 0;
    const descriptions: string[] = [];
    const rawPlayerPoints = new Map<string, number>();

    userPicks.playerIds
      .slice(0, this.fantasyMetaData().numberOfPicks)
      .forEach((id) => {
        const fantasyPlayer = playersMap.get(id + "_" + date);
        if (!fantasyPlayer) return;

      rawPlayerPoints.set(id, (rawPlayerPoints.get(id) || 0) + fantasyPlayer.points);

      if (id === userPicks.captain) {
        points += fantasyPlayer.points * 2;
        descriptions.push(`${fantasyPlayer.playerName}(C)->${fantasyPlayer.points * 2}`);
      } else {
        points += fantasyPlayer.points;
        descriptions.push(`${fantasyPlayer.playerName}->${fantasyPlayer.points}`);
      }
    });

    return allDatesMode
      ? { points, descriptions, rawPlayerPoints }
      : { points, descriptions };
  }


  aggregateAllDates(allFantasy: FantasyData): { name: string; points: number; description: string }[] {
    const fantasyPlayersPointsMap = this.allPlayersPointsMap();

    const userTotals = new Map<
      string,
      {
        points: number;
        playerTotals: Map<string, number>;
        userName: string;
      }
    >();

    Object.entries(allFantasy).forEach(([date, fantasy]) => {
      fantasy.userPicks.forEach((userPicks) => {
        const { points, rawPlayerPoints } = this.processUserPicks(
          userPicks,
          date,
          fantasyPlayersPointsMap,
          true
        );

        if (!userTotals.has(userPicks.userId)) {
          userTotals.set(userPicks.userId, {
            points: 0,
            playerTotals: new Map(),
            userName: userPicks.userName,
          });
        }

        const entry = userTotals.get(userPicks.userId)!;
        entry.points += points;

        // merge raw contributions by player id.
        rawPlayerPoints?.forEach((points, id) => {
          entry.playerTotals.set(id, (entry.playerTotals.get(id) || 0) + points);
        });
      });
    });

    return Array.from(userTotals.values()).map(({ points, playerTotals, userName }) => {
      // show top players by raw (no captain effect)
      const topPlayers = Array.from(playerTotals.entries())
        .sort((playerTotalPoints1, playerTotalPoints2) => playerTotalPoints2[1] - playerTotalPoints1[1])
        .slice(0, 2)
        .map(([id, points]) => {
          const playerName = this.allPlayers().find((p) => p.id === id)?.name || id;
          return `${playerName}->${points}`;
        });

      return {
        name: userName,
        points,
        description: `Top picks (no captain effect): ${topPlayers.join(", ")}`,
      };
    });
  }

  tableData = computed(() => {
    const date = this.selectedDate();

    if (date === 'Select All') {
      return this.aggregateAllDates(this.allFantasyData());
    }

    return this.allFantasyData()[date].userPicks.map((userPicks) => {
      const { points, descriptions } = this.processUserPicks(userPicks, date, this.allPlayersPointsMap(), false);

      return {
        name: userPicks.userName,
        points,
        description: descriptions.join(', ')
      };
    });
  });

  setAllFantasyDates(fantasyData: FantasyData) {
    const fantasyDates = new Set(Object.keys(fantasyData).filter((key) => key !== 'meta'));
    this.allUniqueDates.set(
      [this.selectAllLabel(), ...Array.from(new Set(
        this.allPlayers()
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

  setMetaData(metaData: FantasyMeta) {
    this.fantasyMetaData.set(metaData)
  }
}
