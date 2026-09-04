import { Component, computed, inject, linkedSignal, input, signal } from '@angular/core';
import { form, FormField, pattern, required } from '@angular/forms/signals';
import { of } from 'rxjs';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { PlayersService } from '../../players/players.service';
import { MatchEventsApiService } from '../services/match-events-api.service';
import { MatchEventsManagerService } from '../services/match-events-manager.service';
import { Auth, authState } from '@angular/fire/auth';
import { PopupsService } from 'ui';
import { DatePipe } from '@angular/common';
import { formatElapsedMsAsMmSs, parseMmSsToMinute, parseMmSsToMs } from '../utils/timer-display';
import { MatchEventRecord, MatchRecord, MatchStatus } from '../models/match-event.model';
import { formatTeamLabel } from '../../utils/team-label.util';

@Component({
  selector: 'app-match-events-manager',
  standalone: true,
  imports: [FormField],
  providers: [DatePipe],
  templateUrl: './match-events-manager.component.html',
  styleUrl: './match-events-manager.component.scss'
})
export class MatchEventsManagerComponent {
  private playersService = inject(PlayersService);
  private matchEventsApi = inject(MatchEventsApiService);
  private matchEvents = inject(MatchEventsManagerService);
  private auth = inject(Auth);
  private popupsService = inject(PopupsService);
  private datePipe = inject(DatePipe);

  user = toSignal(authState(this.auth));

  playingTeamKeys = computed(() => this.playersService.selectedTeamsKeys())

  /** Display label for a team slot key (letter + nickname). The stored key is never changed. */
  teamLabelOf = (teamKey: string | undefined | null): string =>
    teamKey ? formatTeamLabel(teamKey, this.playersService.teamAliases()[teamKey]) : '';

  // ── Matches: live Firestore stream, re-runs when the group changes ──────────
  private matchesResource = rxResource({
    params: () => ({
      groupId: this.playersService.selectedGroup()?.id,
      user: this.user()
    }),
    stream: ({ params: { groupId, user } }) => {
      if (!groupId || !user) return of([]);
      return this.matchEventsApi.getMatches(groupId);
    }
  });

  matches = computed(() => (this.matchesResource.value() ?? []) as MatchRecord[]);

  /** Formatted match options for the dropdown to avoid template logic. */
  matchOptions = computed(() => {
    return this.matches().map((match) => {
      let label = '';
      const matchId = match.id ?? 'Unknown-ID';
      if (match.createdAt?.seconds) {
        label = this.datePipe.transform(match.createdAt.seconds * 1000, 'dd/MM/yyyy HH:mm') || matchId;
      } else {
        label = matchId;
      }

      if (match.status === 'completed') {
        const winner = match.winner ? this.teamLabelOf(match.winner) : 'Unknown';
        const loser = match.loser ? this.teamLabelOf(match.loser) : 'Unknown';
        const result = match.gameStatus === 'draw' ? 'Draw' : `${winner} Won`;
        label += ` - ${result} (${winner} ${match.wonTeamScore ?? 0} - ${match.loseTeamScore ?? 0} ${loser})`;
      } else if (match.status === 'live') {
        label += ` - Live`;
      } else if (match.status === 'abandoned') {
        label += ` - Abandoned`;
        if (match.winner || match.loser) {
          label += ` (${this.teamLabelOf(match.winner)} - ${this.teamLabelOf(match.loser)})`;
        }
      }
      return { id: matchId, label };
    });
  });

  // Auto-selects the first match; user can override via the dropdown
  selectedMatchId = linkedSignal(() => this.matches()[0]?.id ?? '');

  selectedMatchLabel = computed(() =>
    this.matchOptions().find(o => o.id === this.selectedMatchId())?.label ?? ''
  );

  // ── Events: live Firestore stream, re-runs when group or selected match changes
  private eventsResource = rxResource({
    params: () => ({
      groupId: this.playersService.selectedGroup()?.id,
      matchId: this.selectedMatchId(),
      user: this.user()
    }),
    stream: ({ params: { groupId, matchId, user } }) => {
      if (!groupId || !matchId || !user) return of([]);
      return this.matchEventsApi.getEvents(groupId, matchId);
    }
  });

  events = computed(() => {
    if (this.isEditingMatch()) {
      return this.localEvents();
    }
    return (this.eventsResource.value() ?? []) as MatchEventRecord[];
  });

  goalEvents = computed(() =>
    this.events().filter((event: MatchEventRecord) => event.type === 'player_goal' && !event.deletedAt)
  );

  // --- Draft Mode State ---
  isEditingMatch = signal(false);
  localMatch = signal<MatchRecord | null>(null);

  draftMatchModel = linkedSignal<{
    status: MatchStatus;
    gameStatus: 'draw' | 'decided';
    winner: string;
    loser: string;
  }>(() => {
    const m = this.localMatch();
    return {
      status: m?.status || 'completed',
      gameStatus: m?.gameStatus || 'decided',
      winner: m?.winner || '',
      loser: m?.loser || ''
    };
  });

  draftMatchForm = form(this.draftMatchModel);
  localEvents = signal<MatchEventRecord[]>([]);

  /** Returns the current match record (either from Firestore or the local draft). */
  currentMatch = computed(() => {
    if (this.isEditingMatch()) return this.localMatch();
    const id = this.selectedMatchId();
    return this.matches().find((match) => match.id === id) ?? null;
  });

  private getMatchTeams(match: MatchRecord | null): string[] {
    const teams = new Set<string>();
    if (match?.winner) teams.add(match.winner);
    if (match?.loser) teams.add(match.loser);

    // If we don't have 2 teams from the record, fallback to playing teams
    if (teams.size < 2) {
      this.playingTeamKeys().forEach((team) => teams.add(team));
    }

    // If still not 2 teams, try extracting from events
    if (teams.size < 2) {
      this.goalEvents().forEach((event) => {
        if (event.teamKey) teams.add(event.teamKey);
      });
    }

    return Array.from(teams).slice(0, 2);
  }

  /** Teams available for selection in the current draft. */


  /** Teams available for selection in the current draft. */
  localMatchTeams = computed(() => {
    const uniqueTeams = new Set<string>();

    // Add explicitly assigned match teams from draft
    const draftMatch = this.localMatch();
    if (draftMatch?.winner) uniqueTeams.add(draftMatch.winner);
    if (draftMatch?.loser) uniqueTeams.add(draftMatch.loser);

    // Safety fallback: Always preserve the original match teams
    const originalMatch = this.matches().find((match) => match.id === this.selectedMatchId());
    if (originalMatch?.winner) uniqueTeams.add(originalMatch.winner);
    if (originalMatch?.loser) uniqueTeams.add(originalMatch.loser);

    // Fallback to currently active playing teams from GameComponent
    this.playingTeamKeys().forEach(team => uniqueTeams.add(team));

    // ALWAYS include any team that has a recorded goal event!
    this.goalEvents().forEach((event) => {
      if (event.teamKey) uniqueTeams.add(event.teamKey);
    });

    return Array.from(uniqueTeams).sort();
  });

  /** Validation: ensure goal tallies match the winner/loser/draw status. */
  isTallyConsistent = computed(() => {
    const match = this.currentMatch();
    if (!match || match.status !== 'completed') return true;

    const teams = this.getMatchTeams(match);
    if (teams.length < 2) return true;

    const events = this.goalEvents();

    // Consistency check: If *any* goal belongs to a team NOT participating in this match, block save.
    const teamsWithGoals = new Set(events.filter(event => event.teamKey).map(event => event.teamKey!));
    for (const team of Array.from(teamsWithGoals)) {
      if (!teams.includes(team)) return false;
    }

    const tally: Record<string, number> = {};
    teams.forEach((key) => (tally[key] = 0));

    events.forEach((event: MatchEventRecord) => {
      if (event.teamKey && teams.includes(event.teamKey)) {
        tally[event.teamKey] = (tally[event.teamKey] || 0) + 1;
      }
    });

    const scoreA = tally[teams[0]] || 0;
    const scoreB = tally[teams[1]] || 0;

    if (match.gameStatus === 'draw') return scoreA === scoreB;
    if (match.winner === teams[0]) return scoreA > scoreB;
    if (match.winner === teams[1]) return scoreB > scoreA;
    return false;
  });

  editingEvent = linkedSignal<MatchEventRecord | null>(() => {
    this.selectedMatchId();
    return null;
  });

  eventModel = linkedSignal<{ playerId: string, time: string }>(() => {
    this.selectedMatchId();
    const event = this.editingEvent();
    if (event) {
      const timerMs = event.payload?.['timerMs'] as number | undefined;
      const time = timerMs != null
        ? formatElapsedMsAsMmSs(timerMs)
        : `${String(event.minute || 0).padStart(2, '0')}:00`;
      return { playerId: event.playerId || '', time };
    }
    return { playerId: '', time: '00:00' };
  });

  eventForm = form(this.eventModel, (fields) => {
    required(fields.playerId);
    pattern(fields.time, /^\d{1,3}:[0-5]\d$/);
  });


  rosterPlayers = computed(() => {
    const allPlayers = this.playersService.flattenPlayers(true, true);
    const matchId = this.selectedMatchId();
    const match = this.matches().find(m => m.id === matchId);

    let allowedTeams: string[] = [];
    if (match) {
      if (match.status === 'completed' && match.winner && match.loser) {
        allowedTeams = [match.winner, match.loser];
      } else {
        // For live, abandon, or incomplete draft status, use playing teams
        allowedTeams = this.playingTeamKeys();
      }
    }

    let filtered = allPlayers;
    if (allowedTeams.length > 0) {
      filtered = allPlayers.filter(player => player.team && allowedTeams.includes(player.team));
    } else {
      filtered = allPlayers.filter(player => player.team !== 'allPlayers');
    }

    return filtered.sort((a, b) => (a.team || '').localeCompare(b.team || ''));
  });

  activePlayerNames = computed(() => this.rosterPlayers().map((player) => player.name));

  /** Format event time for display: timerMs → MM:SS, legacy timerDisplay, or minute fallback. */
  formatEventTime(event: MatchEventRecord): string {
    const timerMs = event.payload?.['timerMs'] as number | undefined;
    if (timerMs != null) return formatElapsedMsAsMmSs(timerMs);
    const timerDisplay = event.payload?.['timerDisplay'] as string | undefined;
    if (timerDisplay) return timerDisplay;
    return `${event.minute ?? '-'}'`;
  }

  onSelectMatch(matchId: string) {
    if (this.isEditingMatch()) {
      this.cancelEditingMatch();
    }
    this.selectedMatchId.set(matchId);
  }

  addForgottenGoalEvent() {
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.selectedMatchId();

    if (!groupId || !matchId || this.eventForm().invalid()) {
      if (this.eventForm().invalid()) {
        const timeErrors = this.eventForm.time().errors();
        if (timeErrors && timeErrors.length > 0 && timeErrors.some(e => e.kind === 'PATTERN')) {
          this.popupsService.addErrorPopOut('Invalid time format. Use MM:SS (e.g. 12:34)');
        } else {
          this.popupsService.addErrorPopOut('Please select a player.');
        }
      }
      return;
    }

    const playerId = this.eventModel().playerId;
    const timeStr = this.eventModel().time;

    const player = this.rosterPlayers().find((p) => p.id === playerId);
    if (!player) {
      return;
    }

    const minute = parseMmSsToMinute(timeStr);

    const currentUser = this.auth.currentUser;
    const createdBy = currentUser?.email ?? currentUser?.uid ?? '';
    if (!createdBy) {
      this.popupsService.addErrorPopOut('Sign in to add events.');
      return;
    }

    const newEvent: MatchEventRecord = {
      type: 'player_goal',
      source: 'manual',
      createdBy,
      playerId: player.id,
      playerNameSnapshot: player.name,
      teamKey: player.team,
      minute,
      payload: { timerMs: parseMmSsToMs(timeStr) }
    };

    this.localEvents.update((list: MatchEventRecord[]) => [...list, newEvent]);

    this.eventModel.set({ playerId: '', time: '00:00' });
    // this.popupsService.addSuccessPopOut('Goal event added');
  }

  startEdit(event: MatchEventRecord) {
    this.editingEvent.set(event);
  }

  cancelEdit() {
    this.editingEvent.set(null);
  }

  saveEdit(event: MatchEventRecord) {
    const eventId = event.id;
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.selectedMatchId();
    if (!groupId || !matchId) return;

    if (this.eventForm().invalid()) {
      this.popupsService.addErrorPopOut('Invalid time format or missing player.');
      return;
    }

    const timeStr = this.eventModel().time;
    const playerIdStr = this.eventModel().playerId;

    const player = this.rosterPlayers().find((p) => p.id === playerIdStr);
    if (!player) return;

    const patch: Partial<MatchEventRecord> = {
      playerId: player.id,
      playerNameSnapshot: player.name,
      teamKey: player.team,
      minute: parseMmSsToMinute(timeStr),
      payload: { timerMs: parseMmSsToMs(timeStr) }
    };

    this.localEvents.update((list: MatchEventRecord[]) =>
      list.map((e: MatchEventRecord) => (e === event ? { ...e, ...patch } : e))
    );

    this.cancelEdit();
  }

  removeEvent(event: MatchEventRecord) {
    const eventId = event.id;
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.selectedMatchId();
    if (!groupId || !matchId) return;

    this.localEvents.update((list: MatchEventRecord[]) => list.filter((e) => e !== event));
  }

  // --- Draft Control Methods ---

  startEditingMatch() {
    const match = this.currentMatch();
    if (!match) return;
    this.localMatch.set(structuredClone(match));
    this.localEvents.set(structuredClone(this.events()));
    this.isEditingMatch.set(true);
  }

  cancelEditingMatch() {
    this.isEditingMatch.set(false);
    this.localMatch.set(null);
    this.localEvents.set([]);
  }

  async saveEditingMatch() {
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.selectedMatchId();
    const oldMatch = this.matches().find((m) => m.id === matchId);
    const newMatch = this.localMatch();
    if (!groupId || !matchId || !oldMatch || !newMatch) return;

    if (!this.isTallyConsistent()) {
      this.popupsService.addErrorPopOut('Goal tally must match the result (Winner/Loser/Draw).');
      return;
    }

    const teams = this.getMatchTeams(newMatch);
    if (teams.length < 2) {
      this.popupsService.addErrorPopOut('Could not identify teams for this match.');
      return;
    }

    const tally: Record<string, number> = {};
    teams.forEach((k) => (tally[k] = 0));
    this.goalEvents().forEach((ev: MatchEventRecord) => {
      if (ev.teamKey && teams.includes(ev.teamKey)) {
        tally[ev.teamKey] = (tally[ev.teamKey] || 0) + 1;
      }
    });

    const updatedMatch = { ...newMatch, ...this.draftMatchModel() };
    const identifiedTeams = this.getMatchTeams(updatedMatch);

    // Ensure roster IDs are up-to-date with current teams (e.g. if a player was added to a team after the game ended)
    const playerArray = this.playersService.flattenPlayers(true, true);

    // Identify winners/losers rosters (or just Team A / Team B in a draw)
    const winningTeam = updatedMatch.winner || identifiedTeams[0];
    const losingTeam = updatedMatch.loser || identifiedTeams[1];

    if (winningTeam) {
      updatedMatch.winnerPlayerIds = playerArray.filter((player) => player.team === winningTeam).map((player) => player.id);
      updatedMatch.winner = winningTeam;
    }
    if (losingTeam) {
      updatedMatch.loserPlayerIds = playerArray.filter((player) => player.team === losingTeam).map((player) => player.id);
      updatedMatch.loser = losingTeam;
    }

    if (updatedMatch.gameStatus === 'draw') {
      updatedMatch.wonTeamScore = tally[identifiedTeams[0]] || 0;
      updatedMatch.loseTeamScore = tally[identifiedTeams[1]] || 0;
    } else {
      updatedMatch.wonTeamScore = tally[updatedMatch.winner!] || 0;
      updatedMatch.loseTeamScore = tally[updatedMatch.loser!] || 0;
    }

    try {
      await this.matchEvents.reconcileMatch(
        groupId,
        matchId,
        oldMatch,
        updatedMatch,
        (this.eventsResource.value() ?? []) as MatchEventRecord[],
        this.localEvents()
      );
      this.popupsService.addSuccessPopOut('Match and statistics updated!');
      this.cancelEditingMatch();
    } catch (err) {
      console.error(err);
      this.popupsService.addErrorPopOut('Failed to save changes.');
    }
  }

  updateLocalMatch(patch: Partial<MatchRecord>) {
    const current = this.localMatch();
    if (!current) return;
    const updated = { ...current, ...patch };

    // Explicit associative swap logic for winner/loser
    if (patch.winner !== undefined && patch.winner === current.loser) {
      updated.loser = current.winner;
    } else if (patch.loser !== undefined && patch.loser === current.winner) {
      updated.winner = current.loser;
    } else if (patch.winner && patch.winner === updated.loser) {
      updated.loser = ''; // prevent same team duplicating
    } else if (patch.loser && patch.loser === updated.winner) {
      updated.winner = ''; // prevent same team duplicating
    }

    // Auto-update rosters if teams changed
    const playerArray = this.playersService.flattenPlayers(true, true);
    if (updated.winner) {
      updated.winnerPlayerIds = playerArray.filter((player) => player.team === updated.winner).map((player) => player.id);
    }
    if (updated.loser) {
      updated.loserPlayerIds = playerArray.filter((player) => player.team === updated.loser).map((player) => player.id);
    }

    this.localMatch.set(updated);
  }
}
