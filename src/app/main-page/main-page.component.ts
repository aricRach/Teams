import {Component, inject, OnInit} from '@angular/core';
import {HeaderComponent} from '../header/header.component';
import {RouterOutlet} from '@angular/router';
import {PlayersService} from '../players/players.service';

@Component({
  selector: 'app-main-page',
  imports: [
    HeaderComponent,
    RouterOutlet
  ],
  templateUrl: './main-page.component.html',
  standalone: true,
  styleUrl: './main-page.component.scss'
})
export class MainPageComponent implements OnInit{

  playersService = inject(PlayersService);

  ngOnInit(): void {
    this.playersService.getAllPlayersFromDatabase()
  }



}
