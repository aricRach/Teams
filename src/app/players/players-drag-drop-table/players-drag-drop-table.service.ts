import {computed, inject, Injectable} from '@angular/core';
import {PlayersService} from '../players.service';
import {balancedTeamsSmallSize, balanceTeams} from './balance-teams';
import {shuffleArray} from '../../utils/array-utils';
import {NotDividableError} from '../errors/not-dividable-error';
import {PopupsService} from 'ui';
import {computeTeamScores, TeamScores} from '../../utils/team-scores.utils';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';

@Injectable()
export class PlayersDragDropTableService {

  playersService = inject(PlayersService);
  popupsService = inject(PopupsService);
  private computedStats = inject(ComputedStatisticsService);

  balanceTeamsTries = 0;

  teamScores = computed<{ [teamKey: string]: TeamScores }>(() =>
    computeTeamScores(this.playersService.getTeams(), this.computedStats.statsMap())
  );

  makeBalancedTeams(teams: any) {
    const numberOfTeams = this.playersService.numberOfTeams();
    const includeGuests = true;
    const teamEntries = Object.entries(teams).slice(1, numberOfTeams + 1);
    const players = this.playersService.flattenPlayers(true, includeGuests, Object.fromEntries(teamEntries));
    this.balanceTeamsTries++;
    if(this.balanceTeamsTries %2 !== 0 && numberOfTeams <= 3 && players.length <= 18) {
      try {
        const teamMap = balancedTeamsSmallSize(shuffleArray(players), teamEntries, numberOfTeams);
        this.playersService.setTeams({...teams, ...teamMap});
      } catch (e) {
        if(e instanceof NotDividableError) {
          this.popupsService.addErrorPopOut(e.message);
        }
      }
    } else {
      const teamMap = balanceTeams(shuffleArray(players), teamEntries, numberOfTeams);
      this.playersService.setTeams({...teams, ...teamMap});
    }
  }
}
