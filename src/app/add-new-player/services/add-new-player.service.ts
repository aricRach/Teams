import {computed, inject, Injectable} from '@angular/core';
import {Player} from '../../players/models/player.model';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {PlayersService} from '../../players/players.service';
import {SpinnerService} from '../../spinner.service';
import {PopupsService} from 'ui';
import {AddNewPlayerApiService} from './add-new-player-api.service';
import {MembersService} from '../../admin/services/members.service';
import {firstValueFrom} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AddNewPlayerService {

  playerForm!: FormGroup;
  private fb = inject(FormBuilder);
  private playersService = inject(PlayersService);
  private membersService = inject(MembersService);
  private spinnerService = inject(SpinnerService);
  private popoutService = inject(PopupsService);
  private addNewPlayerApiService = inject(AddNewPlayerApiService);

  groupId = computed(() => this.playersService.selectedGroup().id);

  constructor() {
    this.playerForm = this.fb.group({
      name: new FormControl('', [Validators.required]),
      rating: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.email]),
    });
  }

  async addNewPlayer(): Promise<void> {
    const {name, rating, email} = this.playerForm.value;
    if (!name?.trim() || !rating) return;
    const normalizedPlayerName = name.trim().toLowerCase();

      const players = await firstValueFrom(this.playersService.getAllPlayers()) as Player[];
      const isPlayerExist = players.some(
        (player: Player) => player.name.toLowerCase() === normalizedPlayerName
      );

      if (isPlayerExist) {
        this.popoutService.addErrorPopOut(`Player with name "${normalizedPlayerName}" already exists as active/inactive player.`);
        return;
      }

      await this.saveNewPlayer({
        name: normalizedPlayerName,
        rating,
        email,
        isActive: true,
        statistics: {}
      } as Player);
  }

  private async saveNewPlayer(newPlayer: Player) {
    try {
      this.spinnerService.setIsLoading(true);
      const playerDoc = await this.addNewPlayerApiService.addPlayerToGroup(this.groupId(), newPlayer);
      this.popoutService.addSuccessPopOut(`${newPlayer.name} successfully added.`);
      const teams = this.playersService.getTeams();
      teams.allPlayers.players.push(playerDoc);
      this.playersService.setTeams(teams);
      this.playerForm.reset();
      await this.membersService.addMember(this.groupId(), newPlayer.email);
    } catch (error) {
      this.popoutService.addErrorPopOut(`Failed to add ${newPlayer.name}. Please try again later.`);
    } finally {
      this.spinnerService.setIsLoading(false);
    }
  }
}
