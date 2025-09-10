import {computed, inject, Injectable, linkedSignal, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {FantasyApiService, FantasyMeta} from './fantasy-api.service';
import {Auth} from '@angular/fire/auth';
import {Player} from '../../players/models/player.model';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {SpinnerService} from '../../spinner.service';
import {PopupsService} from 'ui';
import {Router} from '@angular/router';

@Injectable()
export class FantasyDraftService {

  playersService = inject(PlayersService);
  fantasyApiService = inject(FantasyApiService);
  spinnerService = inject(SpinnerService);
  popupsService = inject(PopupsService);
  router = inject(Router);
  private auth = inject(Auth);
  isDraftDirty = signal(false);

  draftMetaData = signal<FantasyMeta>({} as FantasyMeta);
  captain = signal('');
  allPlayers = computed(() => this.playersService.flattenPlayers())

  allPoolPlayers = linkedSignal(() => {
    const fantasySlotIds = this.fantasySlots().map(p => p?.id).filter(Boolean)
    const fantasySlotsIdsSet = new Set(fantasySlotIds);
    return this.allPlayers().filter((p) => !fantasySlotsIdsSet.has(p.id))
  })

  slotIds = computed(() =>
    Array.from({ length: this.draftMetaData().numberOfPicks }, (_, i) => `slot-${i}`)
  );
  fantasySlots = signal<(Player | null)[]>(Array(this.draftMetaData().numberOfPicks).fill(null));

  readonly selectedPlayerIds = computed(() =>
    this.fantasySlots().filter(p => p !== null).map(p => p!.id)
  );

  readonly canSave = computed(() =>
    this.selectedPlayerIds().length === this.draftMetaData().numberOfPicks
  );

  async getUserPicks(date: string) {
    const uid = this.auth.currentUser?.uid || '';
    const picks = await this.fantasyApiService.getUserFantasyPicksByDate(
      this.playersService.selectedGroup().id,
      date,
      uid
    );

    if (picks?.playerIds?.length) {
      const selected = picks.playerIds.map(id =>
        this.allPlayers().find(p => p.id === id) || null
      );
      this.captain.set(picks.captain);
      const totalSlots = this.draftMetaData().numberOfPicks;
      const filledSlots = Array.from({ length: totalSlots }, (_, i) => selected[i] ?? null);
      this.fantasySlots.set(filledSlots);
    } else { // first time the user choose
      this.fantasySlots.set(Array(this.draftMetaData().numberOfPicks).fill(null));
    }
  }

  onDropToSlot(event: CdkDragDrop<any>, index: number) {
    const player: Player = event.item.data;

    if (this.selectedPlayerIds().includes(player.id)) return;

    this.isDraftDirty.set(true);
    const updated = [...this.fantasySlots()];
    updated[index] = player;
    this.fantasySlots.set(updated);
  }

  onDropToPool(event: CdkDragDrop<Player[]>) {
    const player: Player = event.item.data;

    const updated = this.fantasySlots().map(p => (p?.id === player.id ? null : p));
    this.fantasySlots.set(updated);
  }

  async save() {
    const groupId = this.playersService.selectedGroup().id
    const userId = this.auth.currentUser?.uid;
    const userName = this.auth.currentUser?.displayName || '';
    const playerIds = this.selectedPlayerIds();
    if (playerIds.length !== this.draftMetaData().numberOfPicks) return;
    if(!playerIds.includes(this.captain())) {
      this.popupsService.addErrorPopOut('Please select a captain');
      return;
    }
    try {
      this.spinnerService.setIsLoading(true);
      await this.fantasyApiService.saveFantasyDraft(groupId, this.draftMetaData().nextDate, userId as string, playerIds, this.captain(), userName);
      this.spinnerService.setIsLoading(false);
      this.popupsService.addSuccessPopOut('fantasy draft saved successfully.');
    } catch (e) {
      this.spinnerService.setIsLoading(false);
      this.popupsService.addErrorPopOut('can\'t save fantasy draft please try again later.');
    }
  }

  setCaptain(captainId: string) {
    this.isDraftDirty.set(true);
    this.captain.set(captainId);
  }

  setMetaData(draftMeta: FantasyMeta) {
      this.draftMetaData.set(draftMeta);
  }
}
