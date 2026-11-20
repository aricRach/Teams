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

  /**
   * Returns the balanced teams (or null when they can't be split) instead of saving them, so the page
   * stores them the same way as a drag — e.g. the Team Builder puts hidden teams' players back.
   */
  makeBalancedTeams(teams: any): any | null {
    const numberOfTeams = this.playersService.numberOfTeams();
    const includeGuests = true;
    // Skip the bench by name: the teams object's key order isn't guaranteed.
    const teamEntries = Object.entries(teams)
      .filter(([key]) => key !== this.playersService.allPlayersLabel)
      .slice(0, numberOfTeams);
    const players = this.playersService.flattenPlayers(true, includeGuests, Object.fromEntries(teamEntries));
    this.balanceTeamsTries++;
    if(this.balanceTeamsTries %2 !== 0 && numberOfTeams <= 3 && players.length <= 18) {
      try {
        const teamMap = balancedTeamsSmallSize(shuffleArray(players), teamEntries, numberOfTeams);
        return {...teams, ...teamMap};
      } catch (e) {
        this.popupsService.addErrorPopOut(e instanceof NotDividableError ? e.message : 'Could not balance the teams.');
        return null;
      }
    }
    const teamMap = balanceTeams(shuffleArray(players), teamEntries, numberOfTeams);
    return {...teams, ...teamMap};
  }
}
