import {Component, computed, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';
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
import {collection, collectionData, Firestore} from '@angular/fire/firestore';
import {PlayersService} from './players/players.service';
import {formatDateToString} from './utils/date-utils';

export interface Player {
  name: string;
  rating: number;
  statistics: {
    [key: string]: { // `key` is used to represent date strings (e.g., 'dd-mm-yyyy')
      goals: number;
      wins: number;
      loses: number;
      draws: number;
      games: number;
    };
  };
}

 export interface Team {
  name: string;
  players: Player[];
  totalRating: number;
}

export interface GoalModalEvent {
 team: string;
 player: Player
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule,
    DragDropModule, CommonModule, LongPressDirective,
    StopwatchComponent, ModalComponent, FormsModule, GameDetailsComponent,],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

// todo: separate to components.
// todo: add state.
// todo: add table for statistics
// todo: use directive for show hide sensitive data.
// todo: add permission sensitive data.
// todo: make players to be signal

export class AppComponent implements OnInit{

  playerForm!: FormGroup;
  isAdminMode = signal(false);
  originalTeamNames = signal(['teamA', 'teamB', 'teamC']);
  playersService = inject(PlayersService);


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
  setGoalModalData = signal<GoalModalEvent>({} as GoalModalEvent) ;
  getGoalModalDataByPlayer = computed(() => this.setGoalModalData().player.statistics[this.currentDate].goals || 0)

  isTeamWinModalVisible = signal(false);

  @ViewChild('nameField') nameField!: ElementRef;
  protected isAdminCodeModalVisible = signal(false);


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
      this.teams.allPlayers.players.push({ name, rating, statistics: {
        [this.currentDate]: {
          goals: 0,
          wins: 0,
          loses: 0,
          games: 0,
          draws: 0,
        }
        } });
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
    this.isAdminCodeModalVisible.set(true);
    // if(this.code === 2626) {
    //   this.hideRating = !this.hideRating;

    // }
  }

  openSetGoalModal(event: { mouseEvent: MouseEvent | TouchEvent; player: any; team: string }): void {
    const clientX = event.mouseEvent instanceof MouseEvent ? event.mouseEvent.clientX : (event.mouseEvent as TouchEvent).touches[0].clientX;
    const clientY = event.mouseEvent instanceof MouseEvent ? event.mouseEvent.clientY : (event.mouseEvent as TouchEvent).touches[0].clientY;

    this.modalPosition = { x: clientX, y: clientY };
    this.setGoalModalData.set({
      player: event.player,
      team: event.team
    });
    this.isSetGoalModalVisible = true;
  }

  closeSetGoalModal() {
    this.isSetGoalModalVisible = false;
  }


  setGoals(addGoal: boolean) {
    // @ts-ignore
    const team = this.teams[this.setGoalModalData().team];
    const playerIndex = team.players.findIndex((player: Player) => player.name === this.setGoalModalData().player.name);
    if(playerIndex >= 0) {
      if(addGoal) {
        team.players[playerIndex].statistics[this.currentDate].goals++;
      } else {
        if(team.players[playerIndex].statistics[this.currentDate].goals > 0) {
          team.players[playerIndex].statistics[this.currentDate].goals--;
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

  closeAdminCodeModal() {
    this.isAdminCodeModalVisible.set(false);
  }

  get currentDate() {
    return formatDateToString(new Date())
  }

  endGame(gameDetails: GameDetails) {
    const currentDate = this.currentDate // Format the current date as 'dd-mm-yyyy'
    // Update winners' stats
    // @ts-ignore
    this.teams[gameDetails.winner].players = this.teams[gameDetails.winner].players.map((player: Player) => {
      const updatedStatistics = {
        ...player.statistics,
        [currentDate]: {...player.statistics[currentDate],
          wins: player.statistics[currentDate].wins + (gameDetails.gameStatus === 'decided' ? 1 : 0),
          games: player.statistics[currentDate].games + 1,
          draws: player.statistics[currentDate].draws + (gameDetails.gameStatus === 'decided' ? 0 : 1)
        }
      };

      return {
        ...player,
        statistics: updatedStatistics,
      };
    });

    // Update losers' stats
    // @ts-ignore
    this.teams[gameDetails.loser].players = this.teams[gameDetails.loser].players.map((player: Player) => {
      player.statistics = player.statistics || {};
      const updatedStatistics = {
        ...player.statistics,
        [currentDate]: {...player.statistics[currentDate],
          loses: player.statistics[currentDate].loses + (gameDetails.gameStatus === 'decided' ? 1 : 0),
          games: player.statistics[currentDate].games + 1,
          draws: player.statistics[currentDate].draws + (gameDetails.gameStatus === 'decided' ? 0 : 1)
        }
      };

      return {
        ...player,
        statistics: updatedStatistics,
      };
    });

    this.closeTeamWinModal();
  }


  codeModalSubmitted() {
    this.isAdminCodeModalVisible.set(false);
    if(this.code === '2626') {
      this.isAdminMode.set(!this.isAdminMode());
    }
    this.code = '';
  }

  ngOnInit(): void {
    this.playersService.getPlayers().subscribe(val => console.log(val))
    // this.addPlayerFirebase().then(() => console.log('done'));
  }

  addPlayerFirebase() {
    return this.playersService.addPlayer({
      name: 'yois',
      rating: 9,
      statistics: {
        "2024-01-01": {
          goals: 9,
          wins: 5,
          draws: 9,
          games: 9
        },
        "2024-02-01": {
          goals: 9,
          wins: 5,
          draws: 9,
          games: 9
        },
      }
    })
  }

  getPlayerView(player: Player): string {
    const stats = player.statistics[this.currentDate] ? player.statistics[this.currentDate] : null;
    if(!stats) {
      return !this.isAdminMode() ? player.name : player.name + 'rating - ' + player.rating;
    }
    return !this.isAdminMode() ?
      `${player.name} - goals: ${stats.goals} - wins: ${stats.wins} - loses: ${stats.loses} -games: ${stats.games}`
      : `${player.name} - rating ${player.rating} - goals: ${stats.goals} - wins: ${stats.wins} - loses: ${stats.loses} -games: ${stats.games}`
  }

}
