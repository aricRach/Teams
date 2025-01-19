import {Component, ElementRef, signal, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem, DragDropModule
} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';
import {LongPressDirective} from './directives/long-press.directive';
import {StopwatchComponent} from './stopwatch/stopwatch.component';
import {ModalComponent} from './modal/modal.component';
import {GameDetails, GameDetailsComponent} from './game-details/game-details.component';

 export interface Player {
  name: string;
  rating: number;
  goals: number;
  wins: number;
  loses: number;
  draws: number;
  games: number
}

 export interface Team {
  name: string;
  players: Player[];
  totalRating: number;
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, DragDropModule, CommonModule, LongPressDirective, StopwatchComponent, ModalComponent, FormsModule, GameDetailsComponent],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

// todo: separate to components.
// todo: add state.
// todo: add table for statistics
// todo: use directive for show hide sensitive data.
// todo: add permission sensitive data.

export class AppComponent {

  playerForm!: FormGroup;
  hideRating = signal(true);
  originalTeamNames = signal(['teamA', 'teamB', 'teamC']);

  teams = {
    teamA: {
      players: [] as Player [],
      totalRating: 0
    },
    teamB: {
      players: [] as Player [],
      totalRating: 0,
    },
    teamC: {
      players: [] as Player [],
      totalRating: 0,
    },
    allPlayers: {
      players: [] as Player [],
      totalRating: 0,
    }
  }

  isSetGoalModalVisible = false;
  modalPosition = { x: 0, y: 0 };
  setGoalModalData!: { team: string; player: Player };

  isTeamWinModalVisible = signal(false);

  @ViewChild('nameField') nameField!: ElementRef;
  protected isCodeModalVisible = signal(false);


  drop(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      console.log(event.previousContainer);

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // @ts-ignore
      this.teams[event.previousContainer.id].totalRating = this.calculateRating(event.previousContainer.data);
      // @ts-ignore
      this.teams[event.container.id].totalRating = this.calculateRating(event.container.data);
    }
  }

  calculateRating(players: Player[]) {
    return players.reduce((sum, player) => sum + player.rating, 0);
  }

  constructor(private fb: FormBuilder) {
    this.playerForm = this.fb.group({
      name: '',
      rating: ''
    });
  }

  addPlayer() {
    const { name, rating } = this.playerForm.value;
    if(name && rating > 0) {
      this.teams.allPlayers.players.push({ name, rating, goals: 0, wins: 0, loses: 0, draws: 0, games: 0 });
      this.playerForm.reset();
      this.nameField.nativeElement.focus();
    }
  }

  removeFromList(team: string, index: number) {
    // @ts-ignore
    this.teams[team]?.players.splice(index, 1);
  }

  save() {
    localStorage.setItem('teams', JSON.stringify(this.teams));
  }

  load() {
    const savedTeams = localStorage.getItem('teams');
    if(savedTeams) {
      this.teams = JSON.parse(savedTeams);
    }
  }

  toggleShowHideRating() {
    this.isCodeModalVisible.set(true);
    // if(this.code === 2626) {
    //   this.hideRating = !this.hideRating;

    // }
  }

  openSetGoalModal(event: { mouseEvent: MouseEvent | TouchEvent; player: any; team: string }): void {
    const clientX = event.mouseEvent instanceof MouseEvent ? event.mouseEvent.clientX : (event.mouseEvent as TouchEvent).touches[0].clientX;
    const clientY = event.mouseEvent instanceof MouseEvent ? event.mouseEvent.clientY : (event.mouseEvent as TouchEvent).touches[0].clientY;

    this.modalPosition = { x: clientX, y: clientY };
    this.setGoalModalData = {
      player: event.player,
      team: event.team
    };
    this.isSetGoalModalVisible = true;
  }

  closeSetGoalModal() {
    this.isSetGoalModalVisible = false;
  }


  setGoals(addGoal: boolean) {
    // @ts-ignore
    const team = this.teams[this.setGoalModalData.team];
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData.player.name);
    if(playerIndex >= 0) {
      if(addGoal) {
        team.players[playerIndex].goals++;
      } else {
        if(team.players[playerIndex].goals > 0) {
          team.players[playerIndex].goals--;
        }
      }
    }
  }

  // team win modal
  code!: string;
  showTeamWinModal() {
    this.isTeamWinModalVisible.set(true);
  }

  closeTeamWinModal() {
    this.isTeamWinModalVisible.set(false);
  }

  endGame(gameDetails: GameDetails) {
    // @ts-ignore
    this.teams[gameDetails.winner].players = this.teams[gameDetails.winner].players.map
    ((player: Player) =>
      (gameDetails.gameStatus === 'decided' ?
        {...player, wins: player.wins+1, games: player.games+1} : {...player, draws: player.draws+1, games: player.games+1})
    )
    // @ts-ignore
    this.teams[gameDetails.loser].players = this.teams[gameDetails.loser].players.map
    ((player: Player) =>
      (gameDetails.gameStatus === 'decided' ?
        {...player, loses: player.loses+1, games: player.games+1} : {...player, draws: player.draws+1, games: player.games+1})
    )
    this.closeTeamWinModal();
  }

  codeModalSubmitted() {
    this.isCodeModalVisible.set(false);
    if(this.code === '2626') {
      this.hideRating.set(!this.hideRating());
    }
    this.code = '';
  }
}
