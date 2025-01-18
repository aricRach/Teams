import {Component, computed, ElementRef, signal, ViewChild, WritableSignal} from '@angular/core';
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

interface Player {
  name: string;
  rating: number;
  goals: number;
  wins: number;
  loses: number;
  draws: number;
  games: number
}

interface Team {
  name: string;
  players: Player[];
  totalRating: number;
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, DragDropModule, CommonModule, LongPressDirective, StopwatchComponent, ModalComponent, FormsModule],
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
  hideRating = false;
  originalTeamNames = signal(['teamA', 'teamB', 'teamC']);
  winTeamOptions = computed(() => this.originalTeamNames().filter((name) => {
    return name !== this.selectedLoseTeam();
  }))
  loseTeamOptions = computed(() => this.originalTeamNames().filter((name) => {
      return name !== this.selectedWonTeam();
  }))
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

  isTeamWinModalVisible = false;

  selectedWonTeam = signal(null);
  selectedLoseTeam = signal(null);

  selectedEndGameStatus: WritableSignal<null | 'draw' | 'decided'> = signal(null);

  @ViewChild('nameField') nameField!: ElementRef;


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
    this.hideRating = !this.hideRating;
  }

  openModal(event: {mouseEvent: MouseEvent, player: Player, team: string}) {
    this.modalPosition = { x: event.mouseEvent.clientX, y: event.mouseEvent.clientY };
    this.setGoalModalData = {
      player: event.player, team: event.team
    }
    this.isSetGoalModalVisible = true;
  }

  closeModal() {
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
  showTeamWinModal() {
    this.isTeamWinModalVisible = true;
  }

  closeTeamWinModal() {
    this.resetTeamWinModalData();
  }

  EndGame() {
      // @ts-ignore
      this.teams[this.selectedWonTeam()].players = this.teams[this.selectedWonTeam()].players.map
      ((player: Player) =>
        (this.selectedEndGameStatus() === 'decided' ?
          {...player, wins: player.wins+1, games: player.games+1} : {...player, draws: player.draws+1, games: player.games+1})
      )
      // @ts-ignore
      this.teams[this.selectedLoseTeam()].players = this.teams[this.selectedLoseTeam()].players.map
      ((player: Player) =>
        (this.selectedEndGameStatus() === 'decided' ?
          {...player, loses: player.loses+1, games: player.games+1} : {...player, draws: player.draws+1, games: player.games+1})
      )

    this.resetTeamWinModalData();
  }

  private resetTeamWinModalData() {
    this.selectedWonTeam.set(null);
    this.selectedLoseTeam.set(null);
    this.selectedEndGameStatus.set(null);
    this.isTeamWinModalVisible = false;
  }
}
