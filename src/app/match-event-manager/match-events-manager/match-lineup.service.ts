import { computed, inject, Injectable, signal } from '@angular/core';
import { PlayersService } from '../../players/players.service';
import { MatchEventRecord, MatchRecord } from '../models/match-event.model';
import { formatTeamLabel } from '../../utils/team-label.util';
import { boardLineup, MatchLineups, savedLineups } from './utils/match-lineup.util';
import { findLineupProblem } from './utils/lineup-problem.util';
import { buildLineupViews, LineupView } from './utils/lineup-view.util';
import { buildRosterPlayers, RosterPlayer } from './utils/lineup-roster.util';

// Who played in the match being edited. The page passes in the match's teams, since it owns the edited match.
@Injectable()
export class MatchLineupService {
  private playersService = inject(PlayersService);

  private readonly lineups = signal<MatchLineups>({});
  // Taken from the match when editing starts. Match players are the saved lineups plus the goal scorers.
  private readonly matchPlayerIds = signal<Set<string>>(new Set());
  private readonly nameSnapshots = signal<Map<string, string>>(new Map());
  private readonly teamAliasSnapshot = signal<Record<string, string>>({});

  private readonly allPlayers = computed(() => this.playersService.flattenPlayers(false, true));

  // Current names, falling back to the name saved on the match's goals for players no longer in the group.
  private readonly playerNames = computed(() => {
    const names = new Map(this.nameSnapshots());
    for (const player of this.allPlayers()) names.set(player.id, player.name);
    return names;
  });

  // Active players, plus anyone who played in or scored in this match even if they're inactive now (e.g. a cleared guest).
  private readonly addCandidates = computed(() =>
    this.allPlayers().filter(player => player.isActive || this.matchPlayerIds().has(player.id))
  );

  private readonly playerNameOf = (playerId: string): string =>
    this.playerNames().get(playerId) ?? 'Unknown player';

  // The name the team had when the match was played, like the match picker shows.
  private readonly teamLabelOf = (teamKey: string): string =>
    formatTeamLabel(teamKey, this.teamAliasSnapshot()[teamKey] ?? this.playersService.teamAliases()[teamKey]);

  start(match: MatchRecord, events: MatchEventRecord[]): void {
    const lineups = savedLineups(match);
    const eventPlayers = events.filter(event => event.playerId && !event.deletedAt);
    this.lineups.set(lineups);
    this.matchPlayerIds.set(new Set([
      ...Object.values(lineups).flat(),
      ...eventPlayers.map(event => event.playerId!)
    ]));
    this.nameSnapshots.set(new Map(eventPlayers
      .filter(event => event.playerNameSnapshot)
      .map(event => [event.playerId!, event.playerNameSnapshot!])));
    this.teamAliasSnapshot.set(match.teamAliasSnapshot ?? {});
  }

  reset(): void {
    this.lineups.set({});
    this.matchPlayerIds.set(new Set());
    this.nameSnapshots.set(new Map());
    this.teamAliasSnapshot.set({});
  }

  // A team with no saved lineup (live, reset or very old match, or a team newly picked as winner/loser)
  // starts from the team board until its lineup is edited.
  lineupFor(teamKey: string): string[] {
    return this.lineups()[teamKey] ?? boardLineup(this.playersService.flattenPlayers(true, true), teamKey);
  }

  // True when a lineup shown is only a guess from today's team board.
  usesBoardLineup(teamKeys: string[]): boolean {
    return teamKeys.some(teamKey => !this.lineups()[teamKey]);
  }

  views(teamKeys: string[]): LineupView[] {
    return buildLineupViews(this.lineupsOf(teamKeys), this.addCandidates(), this.teamLabelOf, this.playerNameOf);
  }

  rosterPlayers(teamKeys: string[]): RosterPlayer[] {
    return buildRosterPlayers(this.lineupsOf(teamKeys), this.playerNameOf);
  }

  problem(teamKeys: string[], goalEvents: MatchEventRecord[], isCompleted: boolean): string {
    return findLineupProblem(this.lineupsOf(teamKeys), goalEvents, isCompleted, this.teamLabelOf, this.playerNameOf);
  }

  removeFromLineup(teamKey: string, playerId: string): void {
    const lineup = this.lineupFor(teamKey).filter(id => id !== playerId);
    this.lineups.update(lineups => ({ ...lineups, [teamKey]: lineup }));
  }

  addToLineup(teamKey: string, select: HTMLSelectElement): void {
    const playerId = select.value;
    select.value = '';
    if (!playerId) return;
    const lineup = [...this.lineupFor(teamKey), playerId];
    this.lineups.update(lineups => ({ ...lineups, [teamKey]: lineup }));
  }

  // The lineups of just the match's current teams, e.g. not the old winner after the winner was changed.
  private lineupsOf(teamKeys: string[]): MatchLineups {
    return Object.fromEntries(teamKeys.map(teamKey => [teamKey, this.lineupFor(teamKey)]));
  }
}
