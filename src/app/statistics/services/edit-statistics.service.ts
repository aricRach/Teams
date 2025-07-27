import {inject, linkedSignal} from '@angular/core';
import {StatisticsService} from './statistics.service';
import {PlayersService} from '../../players/players.service';
import {ModalsService, PopupsService} from 'ui';
import {Player, TeamsOptions} from '../../players/models/player.model';
import {EditStatisticsApiService} from './edit-statistics-api.service';
import {SpinnerService} from '../../spinner.service';

export class EditStatisticsService {

  statisticsService = inject(StatisticsService);
  editStatisticsApiService = inject(EditStatisticsApiService);
  spinnerService = inject(SpinnerService);
  playersService = inject(PlayersService);
  modalsService = inject(ModalsService);
  popupsService = inject(PopupsService);

  teams = linkedSignal(() => this.playersService.getTeams())

  async deleteDayStatistics() {
    this.modalsService.openConfirmModal({
      description: `Are you sure you want to <b>delete</b><br> <b>${this.statisticsService.getSelectedDate()}</b> for all players?`
    }).afterClosed().subscribe((res) => {
      if(res) {
        this.statisticsService.deleteAllDayStatistics();

      }
    })
  }

  async updateTeamStatistics(editTeamEvent: { players: Player[], team: TeamsOptions, name: string; number: number }): Promise<void> {
    this.modalsService.openConfirmModal({
      title: `Edit ${editTeamEvent.team} ${editTeamEvent.name}`,
      height: 400,
      description: `Are you sure you want to perform this action?<br>All the team players will be affected.<br>${editTeamEvent.players.map(p => `<b>${p.name}</b>`).join('<br>')}`
    }).afterClosed().subscribe(async (res) => {
      if(res) {
        const statKey = editTeamEvent.name
        const team = editTeamEvent.team
        const selectedDate = this.statisticsService.getSelectedDate();
        const updatedTeamStatistics = editTeamEvent.players.map(player => {
          const currentStats = player.statistics[selectedDate] || {};
          // @ts-ignore
          const currentValue = currentStats[statKey] || 0;
          const newValue = editTeamEvent.number < 0 && currentValue === 0 ? 0 : currentValue + editTeamEvent.number;
          return {
            id: player.id,
            date: selectedDate,
            stats: {
              ...currentStats,
              [statKey]: newValue,
            },
            team
          };
        });
        await this.updateStatisticsForPlayers(updatedTeamStatistics, editTeamEvent.team);
      }
    })
  }

  async updateStatisticsForPlayers(updates: { id: string; team: string, date: string; stats: Record<string, any> }[], team: string): Promise<void> {
    this.spinnerService.setIsLoading(true);
    this.editStatisticsApiService.updateStatisticsForPlayers(this.playersService.selectedGroup().id, updates)
      .then(() => {
        this.applyStatisticsUpdatesToTeams(updates, team)
        this.popupsService.addSuccessPopOut(`${team} was updated successfully.`)
      })
      .finally(() => {
        this.spinnerService.setIsLoading(false);
      })
  }
  applyStatisticsUpdatesToTeams(updates: { id: string; team: string, date: string; stats: Record<string, any> }[], team: string): void {
    const allPlayersMap = new Map<string, Player>(
      this.playersService.flattenPlayers().map(player => [player.id, player])
    );

    const teamToUpdate = { ...this.teams()[team] };
    const newTeam: Player[] = [];

    for (const p of updates) {
      const player = allPlayersMap.get(p.id);
      if (!player) continue;

      const updatedPlayer: Player = {
        ...player,
        // @ts-ignore
        statistics: {
          ...player.statistics,
          [p.date]: p.stats,
        },
      };

      newTeam.push(updatedPlayer);
    }
    teamToUpdate.players = newTeam;
    this.teams.set({...this.teams(), [team]: teamToUpdate});
    this.playersService.setTeams({...this.teams(), [team]: teamToUpdate});
  }

}
