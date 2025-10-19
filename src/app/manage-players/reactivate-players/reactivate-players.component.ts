import {Component, inject, input, OnInit} from '@angular/core';
import {ReactivatePlayersService} from '../services/reactivate-players.service';
import {JsonPipe} from '@angular/common';
import {Player} from '../../players/models/player.model';
import {AutoCompleteComponent} from 'ui';

@Component({
  selector: 'app-reactivate-players',
  imports: [JsonPipe, AutoCompleteComponent],
  providers: [ReactivatePlayersService],
  templateUrl: './reactivate-players.component.html',
  styleUrl: './reactivate-players.component.scss'
})
export class ReactivatePlayersComponent implements OnInit {

  reactivatePlayersService = inject(ReactivatePlayersService);
  inactivePlayers = input<Player[]>();

  ngOnInit(): void {
    this.reactivatePlayersService.setInactivePlayersOptions(this.inactivePlayers()!)
  }
}
