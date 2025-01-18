import {Component, computed, input, output, signal, WritableSignal} from '@angular/core';
import { Player } from '../app.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

export interface GameDetails {
  gameStatus: GameStatus | null
  winner: string | null,
  loser: string | null
}

export enum GameStatus {
  Draw = 'draw',
  Decided = 'decided',
}

@Component({
  selector: 'app-game-details',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './game-details.component.html',
  standalone: true,
  styleUrl: './game-details.component.scss'
})
export class GameDetailsComponent {

  originalTeamNames = input.required<string[]>();
  winTeamOptions = computed(() => this.originalTeamNames().filter((name: string) => {
    return name !== this.selectedLoseTeam();
  }))
  loseTeamOptions = computed(() => this.originalTeamNames().filter((name: string) => {
    return name !== this.selectedWonTeam();
  }))

  selectedWonTeam = signal(null);
  selectedLoseTeam = signal(null);

  selectedEndGameStatus: WritableSignal<null | GameStatus> = signal(null);

  endGame = output<GameDetails>();

  EndGame() {
    this.endGame.emit({
      gameStatus: this.selectedEndGameStatus(),
      winner: this.selectedWonTeam(),
      loser: this.selectedLoseTeam(),
    })
    this.resetTeamWinModalData();
  }

  private resetTeamWinModalData() {
    this.selectedWonTeam.set(null);
    this.selectedLoseTeam.set(null);
    this.selectedEndGameStatus.set(null);
  }

  isSubmitButtonDisabled() {
    return !this.selectedLoseTeam() || !this.selectedWonTeam()
  }
}
