import {ElementRef, inject, Injectable, ViewChild} from '@angular/core';
import {Player} from '../../players/models/player.model';
import {FormBuilder, FormGroup} from '@angular/forms';
import {PlayersService} from '../../players/players.service';
import {SpinnerService} from '../../spinner.service';
import {PopupsService} from 'ui';
import {AddNewPlayerApiService} from './add-new-player-api.service';

@Injectable({
  providedIn: 'root'
})
export class AddNewPlayerService {

  playerForm!: FormGroup;
  private fb = inject(FormBuilder);
  private playersService = inject(PlayersService);
  private spinnerService = inject(SpinnerService);
  private popoutService = inject(PopupsService);
  private addNewPlayerApiService = inject(AddNewPlayerApiService);


  addNewPlayer() {
    const {name, rating} = this.playerForm.value;
    if (name && rating > 0) {

    const newPlayer = {name, rating, isActive: true, statistics: {}} as Player

      const allPlayersArray = this.playersService.flattenPlayers();
      const isPlayerExist = allPlayersArray.some(player => player.name.toLowerCase() === newPlayer.name.toLowerCase());
      if(isPlayerExist) {
        alert(`❌ player with name: ${newPlayer.name} already exist`);
        return;
      }
      this.spinnerService.setIsLoading(true);
      this.addNewPlayerApiService.addPlayerToGroup(this.playersService.selectedGroup().id, newPlayer).then((playerDoc) => {
        this.popoutService.addSuccessPopOut(`${newPlayer.name} successfully added.`);
        const teams = this.playersService.getTeams();
        teams.allPlayers.players.push(playerDoc)
       this.playersService.setTeams(teams);
      }).catch(() => {
        this.popoutService.addErrorPopOut(`cant add ${newPlayer.name},please try again later.`);
      }).finally(() => {
        this.spinnerService.setIsLoading(false);
      })
      this.playerForm.reset();
    }
  }


  constructor() {
    this.playerForm = this.fb.group({
      name: '',
      rating: ''
    });
  }}
