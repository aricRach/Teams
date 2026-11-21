import {computed, inject, Injectable, signal} from '@angular/core';
import {PopupsService} from 'ui';
import {PlayersService} from '../../players/players.service';
import {Player, PLAYER_NAME_MAX_LENGTH, TeamsOptions} from '../../players/models/player.model';
import {ComputedStatisticsService} from '../../statistics/services/computed-statistics.service';
import {AddNewPlayerApiService} from '../../add-new-player/services/add-new-player-api.service';
import {DuplicatePlayerError} from '../../players/errors/duplicate-player-error';
import {createMutation} from '../../shared/optimistic/run-optimistic';
import {defaultGuestRating} from '../utils/default-guest-rating.util';
import {TeamBuilderApiService} from '../team-builder-api.service';
import {matchingGuests} from '../utils/guest-search.util';
import {findPlayerByName, storedName} from '../utils/player-name.util';
import {lastPlayedDate} from '../utils/last-played.util';

@Injectable()
export class AddGuestService {
  private playersService = inject(PlayersService);
  private popupsService = inject(PopupsService);
  private computedStatsService = inject(ComputedStatisticsService);
  private addNewPlayerApiService = inject(AddNewPlayerApiService);
  private teamBuilderApiService = inject(TeamBuilderApiService);

  readonly nameMaxLength = PLAYER_NAME_MAX_LENGTH;
  readonly search = signal('');
  readonly ratingDraft = signal('');

  // Inactive players are cached in PlayersService; load them once if this group hasn't yet.
  readonly isLoadingInactive = signal(false);
  // Without the inactive players the duplicate-name check is incomplete, so creating is turned off.
  readonly hasInactiveLoadFailed = signal(false);
  private readonly inactivePlayers = computed(() => this.playersService.getInactivePlayers() ?? []);
  private readonly activePlayers = computed(() => this.playersService.flattenPlayers(true, true));

  constructor() {
    if (this.playersService.getInactivePlayers()) return;
    this.isLoadingInactive.set(true);
    this.playersService.getPlayersFromDB(false).subscribe({
      next: (players: Player[]) => {
        this.playersService.setInactivePlayers(players);
        this.isLoadingInactive.set(false);
      },
      error: () => {
        this.isLoadingInactive.set(false);
        this.hasInactiveLoadFailed.set(true);
      },
    });
  }

  readonly guestMatches = computed(() => {
    const inactiveGuests = this.inactivePlayers().filter(player => player.isGuest);
    return matchingGuests(inactiveGuests, this.search()).map(guest => ({
      guest,
      lastPlayed: lastPlayedDate(this.computedStatsService.statsMap().get(guest.id)),
    }));
  });
  readonly showNoGuestMatch = computed(() =>
    !this.isLoadingInactive() && !this.hasInactiveLoadFailed() && this.guestMatches().length === 0);

  private readonly typedName = computed(() => storedName(this.search()));
  private readonly playerWithTypedName = computed(() =>
    findPlayerByName([...this.activePlayers(), ...this.inactivePlayers()], this.typedName()));

  /** Why the typed name can't be created, when someone already has it (an inactive guest shows in the list instead). */
  readonly nameTakenMessage = computed(() => {
    const player = this.playerWithTypedName();
    if (!player || (player.isGuest && player.isActive === false)) return '';
    if (player.isActive === false) return `${player.name} is an inactive player. Reactivate them from Manage players.`;
    return player.isGuest ? `${player.name} is already in the Guests pool.` : `${player.name} is already in the group.`;
  });

  readonly canCreate = computed(() =>
    !this.isLoadingInactive() && !this.hasInactiveLoadFailed() && this.typedName().length > 0
    && this.typedName().length <= this.nameMaxLength && !this.playerWithTypedName());
  readonly createLabel = computed(() => `Create “${this.typedName()}” as a guest`);
  readonly nameTooLong = computed(() => this.typedName().length > this.nameMaxLength);

  /** New guests get the group's average rating unless one is typed. */
  readonly defaultRating = computed(() => defaultGuestRating(this.activePlayers()));
  private readonly rating = computed(() => this.ratingDraft().trim() ? Number(this.ratingDraft()) : this.defaultRating());
  readonly isRatingValid = computed(() => this.rating() >= 1 && this.rating() <= 10);

  readonly isBusy = computed(() => this.bringBackGuest.pending() || this.createGuest.pending());

  readonly bringBackGuest = createMutation({
    run: (guest: Player) => this.teamBuilderApiService.setPlayersActive(this.groupId(), [guest], true),
    onSuccess: (_, guest) => {
      this.playersService.showAsActive([guest]);
      this.search.set('');
    },
    onError: (_, guest) => this.popupsService.addErrorPopOut(`Could not bring ${guest.name} back, please try again.`),
  });

  // Takes the name and rating as they were when Create was pressed, so typing during the save doesn't change them.
  readonly createGuest = createMutation({
    run: (name: string, rating: number) => this.addNewPlayerApiService.addPlayerToGroup(this.groupId(), {
      name,
      rating,
      email: '',
      isActive: true,
      isGuest: true,
      team: TeamsOptions.AllPlayers,
      statistics: {},
    } as Player),
    onSuccess: (newGuest, name) => {
      this.playersService.addPlayersSignal([newGuest]);
      // Only clear the box if it still holds the name that was just added.
      if (this.typedName() === name) {
        this.search.set('');
        this.ratingDraft.set('');
      }
    },
    onError: (error, name) => this.popupsService.addErrorPopOut(error instanceof DuplicatePlayerError
      ? error.message
      : `Could not add ${name} as a guest, please try again.`),
  });

  create(): void {
    // Enter can be pressed again while a save runs; the button is disabled then, the key is not.
    if (this.isBusy() || !this.canCreate() || !this.isRatingValid()) return;
    void this.createGuest.run(this.typedName(), this.rating());
  }

  private groupId(): string {
    return this.playersService.selectedGroup().id;
  }
}
