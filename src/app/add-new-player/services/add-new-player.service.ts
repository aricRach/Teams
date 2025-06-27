import {ElementRef, inject, Injectable, ViewChild} from '@angular/core';
import {Player} from '../../players/models/player.model';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {PlayersService} from '../../players/players.service';
import {SpinnerService} from '../../spinner.service';
import {PopupsService} from 'ui';
import {AddNewPlayerApiService} from './add-new-player-api.service';
import {MembersService} from '../../admin/services/members.service';

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

  async addNewPlayer(): Promise<void> {
    const { name, rating, email } = this.playerForm.value;

    if (!name?.trim() || !rating) {
      return;
    }

    const groupId = this.playersService.selectedGroup().id;
    const trimmedName = name.trim();
    const normalizedPlayerName = trimmedName.toLowerCase();

    const isPlayerExist = this.playersService
      .flattenPlayers()
      .some(player => player.name.toLowerCase() === normalizedPlayerName);

    if (isPlayerExist) {
      alert(`❌ Player with name "${trimmedName}" already exists.`);
      return;
    }

    const newPlayer = {
      name: trimmedName,
      rating,
      email,
      isActive: true,
      statistics: {}
    } as Player;

    this.spinnerService.setIsLoading(true);

    let playerDoc;
    try {
      playerDoc = await this.addNewPlayerApiService.addPlayerToGroup(groupId, newPlayer);
    } catch (error) {
      this.popoutService.addErrorPopOut(`Failed to add ${newPlayer.name}. Please try again later.`);
      this.spinnerService.setIsLoading(false);
      return;
    }

    this.popoutService.addSuccessPopOut(`${newPlayer.name} successfully added.`);

    const teams = this.playersService.getTeams();
    teams.allPlayers.players.push(playerDoc);
    this.playersService.setTeams(teams);
    this.playerForm.reset();

    await this.membersService.addMember(groupId, email);

    this.spinnerService.setIsLoading(false);
  }



  constructor() {
    this.playerForm = this.fb.group({
      name: new FormControl('', [Validators.required]),
      rating: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.email]),
    });
  }}
