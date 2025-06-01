import {Component, computed, inject, input, output, signal, WritableSignal} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {PopupsService} from 'ui';

export interface GameDetails {
  gameStatus: GameStatus | null
  winner: string,
  loser: string,
  wonTeamScore: number,
  loseTeamScore: number
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

  private PopupsService = inject(PopupsService);
  originalTeamNames = input.required<string[]>();
  winTeamOptions = computed(() => this.originalTeamNames().filter((name: string) => {
    return name !== this.selectedLoseTeam();
  }))
  loseTeamOptions = computed(() => this.originalTeamNames().filter((name: string) => {
    return name !== this.selectedWonTeam();
  }))

  selectedWonTeam = signal('');
  selectedLoseTeam = signal('');
  wonTeamScore = signal(null);
  loseTeamScore = signal(null);

  hasScoreError = signal(false)

  selectedEndGameStatus: WritableSignal<null | GameStatus> = signal(null);

  endGame = output<GameDetails>();

  EndGame() {
    const wonTeamScore = this.wonTeamScore();
    const loseTeamScore = this.loseTeamScore();
    if( wonTeamScore === null || loseTeamScore === null) {
      return;
    }
    if(this.selectedEndGameStatus() === GameStatus.Draw) {
      if(loseTeamScore !== wonTeamScore) {
        this.PopupsService.addErrorPopOut('Scores must be equal on draw');
        this.hasScoreError.set(true);
        return;
      }
    }
    if(this.selectedEndGameStatus() === GameStatus.Decided) {
      if(loseTeamScore >= wonTeamScore) {
        this.PopupsService.addErrorPopOut('The winner score is lower then the loser score')
        this.hasScoreError.set(true);
        return;
      }
    }
    this.hasScoreError.set(false);
    this.endGame.emit({
      gameStatus: this.selectedEndGameStatus(),
      winner: this.selectedWonTeam(),
      loser: this.selectedLoseTeam(),
      wonTeamScore: +wonTeamScore,
      loseTeamScore: +loseTeamScore,
    })
    this.resetTeamWinModalData();
  }

  private resetTeamWinModalData() {
    this.selectedWonTeam.set('');
    this.selectedLoseTeam.set('');
    this.selectedEndGameStatus.set(null);
  }

  isSubmitButtonDisabled() {
    return !this.selectedLoseTeam() || !this.selectedWonTeam() || this.wonTeamScore() === null || this.loseTeamScore() === null
  }
}
