import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { ModalsService, PopupsService } from 'ui';
import { PlayersService } from '../../players/players.service';
import { MatchEventsApiService } from '../services/match-events-api.service';
import { MatchRecord } from '../models/match-event.model';
import { createMutation } from '../../shared/optimistic/run-optimistic';
import { buildMatchDay, matchDayKey } from './utils/match-day.util';

// The page's matches and its selected match, or null while a match is being edited (the day actions are hidden then).
export interface MatchDaySelection {
  matches: MatchRecord[];
  selectedMatch: MatchRecord | null;
}

// Voids a whole day of matches, so it stops counting in the statistics, or restores it.
// Only the status changes, so restoring brings the day back exactly as it was.
@Injectable()
export class MatchDayVoidService {
  private playersService = inject(PlayersService);
  private matchEventsApi = inject(MatchEventsApiService);
  private modalsService = inject(ModalsService);
  private popupsService = inject(PopupsService);

  // Set once by the page with connect(), since the page owns the matches and the selected match.
  private readonly selection = signal<Signal<MatchDaySelection | null>>(signal(null));
  private readonly confirmOpen = signal(false);

  // No success popup: the Void/Restore button and the "Voided" match label change, which is the feedback.
  private readonly setDayStatus = createMutation({
    run: (groupId: string, matchIds: string[], patch: Partial<MatchRecord>) =>
      this.matchEventsApi.updateMatches(groupId, matchIds, patch),
    onError: (_, _groupId, _matchIds, patch) => this.popupsService.addErrorPopOut(patch.status === 'voided'
      ? 'Could not void the day. Please try again.'
      : 'Could not restore the day. Please try again.'),
  });

  // While a confirm popup is open the buttons are disabled too, so a double click can't open a second one.
  readonly busy = computed(() => this.setDayStatus.pending() || this.confirmOpen());

  readonly matchDay = computed(() => {
    const selection = this.selection()();
    const dayKey = matchDayKey(selection?.selectedMatch ?? null);
    return selection && dayKey ? buildMatchDay(selection.matches, dayKey) : null;
  });

  // Not while a match of that day is still live: it would end as completed and count for a voided day.
  readonly showVoidDay = computed(() => !!this.matchDay()?.completedMatchIds.length && !this.matchDay()?.hasLiveMatch);
  readonly showLiveMatchHint = computed(() => !!this.matchDay()?.completedMatchIds.length && !!this.matchDay()?.hasLiveMatch);
  readonly showRestoreDay = computed(() => !!this.matchDay()?.voidedMatchIds.length);
  readonly voidDayLabel = computed(() =>
    `Void the whole day ${this.matchDay()?.dayKey} (${this.matchCountText(this.matchDay()?.completedMatchIds.length)})`);
  readonly restoreDayLabel = computed(() =>
    `Restore the whole day ${this.matchDay()?.dayKey} (${this.matchCountText(this.matchDay()?.voidedMatchIds.length)})`);

  connect(selection: Signal<MatchDaySelection | null>): void {
    this.selection.set(selection);
  }

  voidDay(): void {
    const day = this.matchDay();
    if (!day || this.busy()) return;
    const count = day.completedMatchIds.length;
    this.confirm({
      title: `Void the whole day ${day.dayKey}?`,
      description: `All ${count} ${count === 1 ? 'match' : 'matches'} played that day, not just the selected one, ` +
        'stop counting in every statistic: games, wins, goals, Leaders, Team of the Week and fantasy. ' +
        'You can restore the day here later.',
      confirmBtn: 'void day',
      danger: true,
    }, () => this.save(day.completedMatchIds, { status: 'voided', voidedBy: 'day' }));
  }

  restoreDay(): void {
    const day = this.matchDay();
    if (!day || this.busy()) return;
    const count = day.voidedMatchIds.length;
    this.confirm({
      title: `Restore the whole day ${day.dayKey}?`,
      description: `The ${count} ${count === 1 ? 'match' : 'matches'} voided with the day ` +
        `${count === 1 ? 'counts' : 'count'} in the statistics again.`,
      confirmBtn: 'restore day',
    }, () => this.save(day.voidedMatchIds, { status: 'completed', voidedBy: null }));
  }

  private confirm(modal: { title: string; description: string; confirmBtn: string; danger?: boolean }, onConfirm: () => void): void {
    this.confirmOpen.set(true);
    this.modalsService.openConfirmModal(modal).afterClosed().subscribe((confirmed: string) => {
      this.confirmOpen.set(false);
      if (confirmed) onConfirm();
    });
  }

  private save(matchIds: string[], patch: Partial<MatchRecord>): void {
    const groupId = this.playersService.selectedGroup()?.id;
    if (!groupId || !matchIds.length) return;
    void this.setDayStatus.run(groupId, matchIds, patch);
  }

  private matchCountText(count = 0): string {
    return count === 1 ? '1 match' : `${count} matches`;
  }
}
