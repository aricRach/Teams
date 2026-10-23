import {computed, inject, Injectable} from '@angular/core';
import {Player, PLAYER_NAME_MAX_LENGTH} from '../../players/models/player.model';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {PlayersService} from '../../players/players.service';
import {createMutation} from '../../shared/optimistic/run-optimistic';
import {PopupsService} from 'ui';
import {AddNewPlayerApiService} from './add-new-player-api.service';
import {MembersService} from '../../admin/services/members.service';
import {DuplicatePlayerError} from '../../players/errors/duplicate-player-error';

@Injectable({
  providedIn: 'root'
})
export class AddNewPlayerService {

  playerForm!: FormGroup;
  private fb = inject(FormBuilder);
  private playersService = inject(PlayersService);
  private membersService = inject(MembersService);
  private popoutService = inject(PopupsService);
  private addNewPlayerApiService = inject(AddNewPlayerApiService);

  groupId = computed(() => this.playersService.selectedGroup().id);

  constructor() {
    this.playerForm = this.fb.group({
      name: new FormControl('', [Validators.required, Validators.maxLength(PLAYER_NAME_MAX_LENGTH)]),
      rating: new FormControl('', [Validators.required, Validators.min(1), Validators.max(10)]),
      email: new FormControl('', [Validators.email]),
      isGuest: new FormControl(false)
    });
  }

  readonly addPlayer = createMutation({
    run: async (newPlayer: Player) => {
      const playerDoc = await this.addNewPlayerApiService.addPlayerToGroup(this.groupId(), newPlayer);
      const teams = this.playersService.getTeams();
      teams.allPlayers.players.push(playerDoc);
      this.playersService.setTeams(teams);
      this.playerForm.reset();
      await this.membersService.addMember(this.groupId(), newPlayer.email);
    },
    onSuccess: (_, newPlayer) => this.popoutService.addSuccessPopOut(`${newPlayer.name} successfully added.`),
    onError: (error, newPlayer) => this.popoutService.addErrorPopOut(error instanceof DuplicatePlayerError
      ? error.message
      : `Failed to add ${newPlayer.name}. Please try again later.`),
  });

  async addNewPlayer(): Promise<void> {
    const {name, rating, email, isGuest} = this.playerForm.value;
    if (!name?.trim() || !rating) return;
    const normalizedPlayerName = name.trim().toLowerCase();
    await this.addPlayer.run({
      name: normalizedPlayerName,
      rating,
      email,
      isActive: true,
      isGuest,
      statistics: {}
    } as Player);
  }
}
