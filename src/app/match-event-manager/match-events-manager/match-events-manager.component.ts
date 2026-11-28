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
import { formatElapsedMsAsMmSs, parseMmSsToMinute, parseMmSsToMs, toDisplayMinute } from '../utils/timer-display';
import { MatchEventRecord, MatchRecord, MatchStatus } from '../models/match-event.model';
import { isScoringEvent } from '../utils/scoring.util';
import { formatTeamLabel } from '../../utils/team-label.util';
import { FormLayoutComponent } from '../../shared/layouts/form-layout/form-layout.component';
import { MatchLineupService } from './match-lineup.service';
import { RosterPlayer } from './utils/lineup-roster.util';
import { MatchDayVoidService } from './match-day-void.service';

@Component({
  selector: 'app-match-events-manager',
  standalone: true,
  imports: [FormField, FormLayoutComponent],
  providers: [DatePipe, MatchLineupService, MatchDayVoidService],
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
  protected matchLineupService = inject(MatchLineupService);
  protected matchDayVoidService = inject(MatchDayVoidService);

  user = toSignal(authState(this.auth));

  // The teams on today's board, without the bench.
  playingTeamKeys = computed(() =>
    this.playersService.selectedTeamsKeys().filter(teamKey => teamKey !== this.playersService.allPlayersLabel)
  );

  teamLabelOf = (teamKey: string | undefined | null): string =>
    teamKey ? formatTeamLabel(teamKey, this.playersService.teamAliases()[teamKey]) : '';

  private matchTeamLabelOf = (teamKey: string | undefined | null, match: MatchRecord): string =>
    teamKey ? formatTeamLabel(teamKey, match.teamAliasSnapshot?.[teamKey]) : '';

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
        const winner = match.winner ? this.matchTeamLabelOf(match.winner, match) : 'Unknown';
        const loser = match.loser ? this.matchTeamLabelOf(match.loser, match) : 'Unknown';
        const result = match.gameStatus === 'draw' ? 'Draw' : `${winner} Won`;
        label += ` - ${result} (${winner} ${match.wonTeamScore ?? 0} - ${match.loseTeamScore ?? 0} ${loser})`;
      } else if (match.status === 'live') {
        label += ` - Live`;
      } else if (match.status === 'abandoned') {
        label += ` - Abandoned`;
        if (match.winner || match.loser) {
          label += ` (${this.matchTeamLabelOf(match.winner, match)} - ${this.matchTeamLabelOf(match.loser, match)})`;
        }
      } else if (match.status === 'voided') {
        label += ` - Voided (doesn't count)`;
      }
      label = `${match.mode === 'league' ? '[League]' : '[Single]'} ${label}`;
      return { id: matchId, label };
    });
  });

  currentMatchMode = computed<'single' | 'league'>(() =>
    this.currentMatch()?.mode === 'league' ? 'league' : 'single'
  );

  // The matches update live (e.g. after Void day or a save), so keep the selected match while it still exists
  // instead of jumping back to the newest one.
  selectedMatchId = linkedSignal<MatchRecord[], string>({
    source: this.matches,
    computation: (matches, previous) =>
      previous && matches.some(match => match.id === previous.value) ? previous.value : matches[0]?.id ?? ''
  });

  selectedMatchLabel = computed(() =>
    this.matchOptions().find(o => o.id === this.selectedMatchId())?.label ?? ''
  );

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
    this.events().filter((event: MatchEventRecord) => isScoringEvent(event))
  );

  isEditingMatch = signal(false);
  localMatch = signal<MatchRecord | null>(null);

  draftMatchModel = linkedSignal<{
    status: MatchStatus;
    gameStatus: 'draw' | 'decided';
    winner: string;
    loser: string;
    mode: 'single' | 'league';
  }>(() => {
    const m = this.localMatch();
    return {
      status: m?.status || 'completed',
      gameStatus: m?.gameStatus || 'decided',
      winner: m?.winner || '',
      loser: m?.loser || '',
      mode: m?.mode === 'league' ? 'league' : 'single'
    };
  });

  draftMatchForm = form(this.draftMatchModel);
  localEvents = signal<MatchEventRecord[]>([]);

  currentMatch = computed(() => {
    if (this.isEditingMatch()) return this.localMatch();
    const id = this.selectedMatchId();
    return this.matches().find((match) => match.id === id) ?? null;
  });

  // The two teams of a match. A match without a winner/loser (live, or reset and abandoned) still has the
  // teamKeys saved when it started; only very old matches without them fall back to the goals and today's board.
  private getMatchTeams(match: MatchRecord | null): string[] {
    const teams = new Set<string>();
    if (match?.winner) teams.add(match.winner);
    if (match?.loser) teams.add(match.loser);

    if (teams.size < 2) {
      match?.teamKeys?.forEach((team) => teams.add(team));
    }

    if (teams.size < 2) {
      this.goalEvents().forEach((event) => {
        if (event.teamKey) teams.add(event.teamKey);
      });
    }

    if (teams.size < 2) {
      this.playingTeamKeys().forEach((team) => teams.add(team));
    }

    return Array.from(teams).slice(0, 2);
  }


  localMatchTeams = computed(() => {
    const uniqueTeams = new Set<string>();

    const draftMatch = this.localMatch();
    if (draftMatch?.winner) uniqueTeams.add(draftMatch.winner);
    if (draftMatch?.loser) uniqueTeams.add(draftMatch.loser);

    const originalMatch = this.matches().find((match) => match.id === this.selectedMatchId());
    if (originalMatch?.winner) uniqueTeams.add(originalMatch.winner);
    if (originalMatch?.loser) uniqueTeams.add(originalMatch.loser);
    originalMatch?.teamKeys?.forEach(team => uniqueTeams.add(team));

    this.playingTeamKeys().forEach(team => uniqueTeams.add(team));

    this.goalEvents().forEach((event) => {
      if (event.teamKey) uniqueTeams.add(event.teamKey);
    });

    return Array.from(uniqueTeams).sort();
  });

  isTallyConsistent = computed(() => {
    const match = this.currentMatch();
    if (!match || match.status !== 'completed') return true;

    const teams = this.getMatchTeams(match);
    if (teams.length < 2) return true;

    const events = this.goalEvents();

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

  ownGoalModel = linkedSignal<{ playerId: string; time: string }>(() => {
    this.selectedMatchId();
    return { playerId: '', time: '00:00' };
  });

  ownGoalForm = form(this.ownGoalModel, (fields) => {
    required(fields.playerId);
    pattern(fields.time, /^\d{1,3}:[0-5]\d$/);
  });

  ownGoalBeneficiaryTeam = computed(() => {
    const player = this.rosterPlayers().find((p) => p.id === this.ownGoalModel().playerId);
    if (!player?.team) return '';
    return this.getMatchTeams(this.currentMatch()).find((team) => team !== player.team) ?? '';
  });


  rosterPlayers = computed<RosterPlayer[]>(() => {
    if (this.isEditingMatch()) {
      return this.matchLineupService.rosterPlayers();
    }
    const allPlayers = this.playersService.flattenPlayers(true, true);
    const matchId = this.selectedMatchId();
    const match = this.matches().find(m => m.id === matchId);

    let allowedTeams: string[] = [];
    if (match) {
      if (match.status === 'completed' && match.winner && match.loser) {
        allowedTeams = [match.winner, match.loser];
      } else {
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

  constructor() {
    // The day actions are hidden while a match is being edited.
    this.matchDayVoidService.connect(computed(() => this.isEditingMatch()
      ? null
      : { matches: this.matches(), selectedMatch: this.currentMatch() }));
    // The teams of the match being edited are the ones whose lineups are shown and saved.
    this.matchLineupService.connect(computed(() => ({
      teamKeys: this.getMatchTeams(this.localMatch()),
      goalEvents: this.goalEvents(),
      isCompleted: this.draftMatchModel().status === 'completed'
    })));
  }

  formatEventTime(event: MatchEventRecord): string {
    const timerMs = event.payload?.['timerMs'] as number | undefined;
    if (timerMs != null) return formatElapsedMsAsMmSs(timerMs);
    const timerDisplay = event.payload?.['timerDisplay'] as string | undefined;
    if (timerDisplay) return timerDisplay;
    return `${toDisplayMinute(event.minute) ?? '-'}'`;
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
      this.popupsService.addErrorPopOut('Pick a player from the lineup.');
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
  }

  addForgottenOwnGoalEvent() {
    const groupId = this.playersService.selectedGroup()?.id;
    const matchId = this.selectedMatchId();

    if (!groupId || !matchId || this.ownGoalForm().invalid()) {
      this.popupsService.addErrorPopOut('Pick the conceding player and a valid MM:SS time.');
      return;
    }

    const { playerId, time } = this.ownGoalModel();
    const player = this.rosterPlayers().find((p) => p.id === playerId);
    if (!player) {
      this.popupsService.addErrorPopOut('Pick a player from the lineup.');
      return;
    }

    const beneficiaryTeamKey = this.ownGoalBeneficiaryTeam();
    if (!beneficiaryTeamKey) {
      this.popupsService.addErrorPopOut('Could not determine the opposing team for this match.');
      return;
    }

    const currentUser = this.auth.currentUser;
    const createdBy = currentUser?.email ?? currentUser?.uid ?? '';
    if (!createdBy) {
      this.popupsService.addErrorPopOut('Sign in to add events.');
      return;
    }

    const newEvent: MatchEventRecord = {
      type: 'own_goal',
      source: 'manual',
      createdBy,
      playerId: player.id,
      playerNameSnapshot: player.name,
      teamKey: beneficiaryTeamKey,
      minute: parseMmSsToMinute(time),
      payload: { timerMs: parseMmSsToMs(time) }
    };

    this.localEvents.update((list: MatchEventRecord[]) => [...list, newEvent]);
    this.ownGoalModel.set({ playerId: '', time: '00:00' });
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
    if (!player) {
      this.popupsService.addErrorPopOut('Pick a player from the lineup.');
      return;
    }

    // An own_goal's teamKey is the beneficiary team, not the (conceding) player's team - keep it.
    const patch: Partial<MatchEventRecord> = {
      playerId: player.id,
      playerNameSnapshot: player.name,
      teamKey: event.type === 'own_goal' ? event.teamKey : player.team,
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

  startEditingMatch() {
    const match = this.currentMatch();
    if (!match) return;
    this.localMatch.set(structuredClone(match));
    this.localEvents.set(structuredClone(this.events()));
    this.matchLineupService.start(match, this.events());
    this.isEditingMatch.set(true);
  }

  cancelEditingMatch() {
    this.isEditingMatch.set(false);
    this.localMatch.set(null);
    this.localEvents.set([]);
    this.matchLineupService.reset();
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
    if (this.matchLineupService.problem()) {
      this.popupsService.addErrorPopOut(this.matchLineupService.problem());
      return;
    }

    const draft = this.draftMatchModel();
    // Only a completed match gets a result and lineups. Any other status keeps the saved result as it was,
    // so e.g. a voided match doesn't get a made-up winner and loser.
    const updatedMatch = draft.status === 'completed'
      ? this.withResult(newMatch, draft)
      : { ...oldMatch, status: draft.status, mode: draft.mode };
    if (!updatedMatch) return;

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

  // The winner, loser, lineups and scores of a completed match, or null (with an error popup) when its teams are unknown.
  private withResult(newMatch: MatchRecord, draft: Partial<MatchRecord>): MatchRecord | null {
    const teams = this.getMatchTeams(newMatch);
    if (teams.length < 2) {
      this.popupsService.addErrorPopOut('Could not identify teams for this match.');
      return null;
    }

    const tally: Record<string, number> = {};
    teams.forEach((k) => (tally[k] = 0));
    this.goalEvents().forEach((ev: MatchEventRecord) => {
      if (ev.teamKey && teams.includes(ev.teamKey)) {
        tally[ev.teamKey] = (tally[ev.teamKey] || 0) + 1;
      }
    });

    const updatedMatch: MatchRecord = { ...newMatch, ...draft };
    const identifiedTeams = this.getMatchTeams(updatedMatch);

    const winningTeam = updatedMatch.winner || identifiedTeams[0];
    const losingTeam = updatedMatch.loser || identifiedTeams[1];

    if (winningTeam) {
      updatedMatch.winnerPlayerIds = this.matchLineupService.lineupFor(winningTeam);
      updatedMatch.winner = winningTeam;
    }
    if (losingTeam) {
      updatedMatch.loserPlayerIds = this.matchLineupService.lineupFor(losingTeam);
      updatedMatch.loser = losingTeam;
    }

    if (updatedMatch.gameStatus === 'draw') {
      updatedMatch.wonTeamScore = tally[identifiedTeams[0]] || 0;
      updatedMatch.loseTeamScore = tally[identifiedTeams[1]] || 0;
    } else {
      updatedMatch.wonTeamScore = tally[updatedMatch.winner!] || 0;
      updatedMatch.loseTeamScore = tally[updatedMatch.loser!] || 0;
    }

    return updatedMatch;
  }

  updateLocalMatch(patch: Partial<MatchRecord>) {
    const current = this.localMatch();
    if (!current) return;
    const updated = { ...current, ...patch };

    if (patch.winner !== undefined && patch.winner === current.loser) {
      updated.loser = current.winner;
    } else if (patch.loser !== undefined && patch.loser === current.winner) {
      updated.winner = current.loser;
    } else if (patch.winner && patch.winner === updated.loser) {
      updated.loser = '';
    } else if (patch.loser && patch.loser === updated.winner) {
      updated.winner = '';
    }

    // Lineups aren't taken from the team board here: MatchLineupService keeps them per team and they're written on save.

    this.localMatch.set(updated);
  }
}
