import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { PlayersService } from '../../players/players.service';
import { MatchEventRecord, MatchRecord } from '../models/match-event.model';
import { formatTeamLabel } from '../../utils/team-label.util';
import { boardLineup, MatchLineups, savedLineups } from './utils/match-lineup.util';
import { findLineupProblem } from './utils/lineup-problem.util';
import { buildLineupViews, LineupView } from './utils/lineup-view.util';
import { buildRosterPlayers, RosterPlayer } from './utils/lineup-roster.util';

// What the lineups depend on in the match being edited. The page owns the edited match, so it passes these in.
export interface LineupMatch {
  teamKeys: string[];
  goalEvents: MatchEventRecord[];
  isCompleted: boolean;
}

// Who played in the match being edited.
@Injectable()
export class MatchLineupService {
  private playersService = inject(PlayersService);

  // Set once by the page with connect().
  private readonly editedMatch = signal<Signal<LineupMatch>>(signal({ teamKeys: [], goalEvents: [], isCompleted: false }));
  private readonly isEditing = signal(false);

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

  // The lineups of just the match's current teams, e.g. not the old winner after the winner was changed.
  private readonly currentLineups = computed<MatchLineups>(() =>
    Object.fromEntries(this.editedMatch()().teamKeys.map(teamKey => [teamKey, this.lineupFor(teamKey)])));

  readonly views = computed<LineupView[]>(() =>
    buildLineupViews(this.currentLineups(), this.addCandidates(), this.teamLabelOf, this.playerNameOf));

  // While editing, goals can be credited to the players in the lineups.
  readonly rosterPlayers = computed<RosterPlayer[]>(() => buildRosterPlayers(this.currentLineups(), this.playerNameOf));

  // Only a completed match saves its lineups, so they're edited (and checked) only then.
  readonly showLineups = computed(() => this.isEditing() && this.editedMatch()().isCompleted);

  // True when a lineup shown is only a guess from today's team board.
  readonly usesBoardLineup = computed(() =>
    this.showLineups() && this.editedMatch()().teamKeys.some(teamKey => !this.lineups()[teamKey]));

  readonly problem = computed(() => this.showLineups()
    ? findLineupProblem(this.currentLineups(), this.editedMatch()().goalEvents, true, this.teamLabelOf, this.playerNameOf)
    : '');

  connect(editedMatch: Signal<LineupMatch>): void {
    this.editedMatch.set(editedMatch);
  }

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
    this.isEditing.set(true);
  }

  reset(): void {
    this.lineups.set({});
    this.matchPlayerIds.set(new Set());
    this.nameSnapshots.set(new Map());
    this.teamAliasSnapshot.set({});
    this.isEditing.set(false);
  }

  // A team with no saved lineup (live, reset or very old match, or a team newly picked as winner/loser)
  // starts from the team board until its lineup is edited.
  lineupFor(teamKey: string): string[] {
    return this.lineups()[teamKey] ?? boardLineup(this.playersService.flattenPlayers(true, true), teamKey);
  }

  removeFromLineup(teamKey: string, playerId: string): void {
    const lineup = this.lineupFor(teamKey).filter(id => id !== playerId);
    this.lineups.update(lineups => ({ ...lineups, [teamKey]: lineup }));
  }

  addToLineup(teamKey: string, playerId: string): void {
    if (!playerId) return;
    const lineup = [...this.lineupFor(teamKey), playerId];
    this.lineups.update(lineups => ({ ...lineups, [teamKey]: lineup }));
  }
}
