import {Component, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {StopwatchComponent} from './stopwatch/stopwatch.component';
import {ModalComponent} from './modal/modal.component';
import {GameDetails, GameDetailsComponent} from './game-details/game-details.component';
import {PlayersService} from './players/players.service';
import {formatDateToString} from './utils/date-utils';
import {PlayersDragDropTableComponent} from './players/players-drag-drop-table/players-drag-drop-table.component';

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
  imports: [ReactiveFormsModule, CommonModule, PlayersDragDropTableComponent,
    StopwatchComponent, ModalComponent, FormsModule, GameDetailsComponent,],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

// todo: separate to components.
// todo: add state.
// todo: add table for statistics
// todo: set goals just after clicking set.
// todo: when drag and drop and then save and load there are duplicates

export class AppComponent implements OnInit{

  playerForm!: FormGroup;
  isAdminMode = signal(false);
  originalTeamNames = signal(['teamA', 'teamB', 'teamC']);
  playersService = inject(PlayersService);

  isTeamWinModalVisible = signal(false);

  @ViewChild('nameField') nameField!: ElementRef;
  protected isAdminCodeModalVisible = signal(false);

  constructor(private fb: FormBuilder) {
    this.playerForm = this.fb.group({
      name: '',
      rating: ''
    });
  }

  addPlayer() {
    const {name, rating} = this.playerForm.value;
    if (name && rating > 0) {
      this.playersService.teams.update((teams: any) => {
        teams.allPlayers.players.push({
          name, rating, statistics: {
            [this.currentDate]: {
              goals: 0,
              wins: 0,
              loses: 0,
              games: 0,
              draws: 0,
            }
          }
        })
        return teams
      })

      this.playerForm.reset();
      this.nameField.nativeElement.focus();
    }
  }

  save() {
    localStorage.setItem('teams', JSON.stringify(this.playersService.teams()));
  }

  load() {
    const savedTeams = localStorage.getItem('teams');
    if(savedTeams) {
      const teamsObj = JSON.parse(savedTeams);
      this.playersService.teams.set({...this.playersService.updateStatisticsWithDefaults(teamsObj, this.currentDate)});
    }
  }

  toggleShowHideRating() {
    this.isAdminCodeModalVisible.set(true);
  }

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
    const currentDate = this.currentDate;

    // Update winners' stats
    // @ts-ignore
    const winners = this.playersService.teams()[gameDetails.winner].players.map((player: Player) => {
      const currentStats = player.statistics[currentDate] || {};
      const updatedStatistics = {
        ...player.statistics,
        [currentDate]: {
          ...currentStats,
          wins: (currentStats.wins || 0) + (gameDetails.gameStatus === 'decided' ? 1 : 0),
          games: (currentStats.games || 0) + 1,
          draws: (currentStats.draws || 0) + (gameDetails.gameStatus === 'decided' ? 0 : 1),
        },
      };

      return {
        ...player,
        statistics: updatedStatistics,
      };
    });

    // Update losers' stats
    // @ts-ignore
    const losers = this.playersService.teams()[gameDetails.loser].players.map((player: Player) => {
      const currentStats = player.statistics[currentDate] || {};
      const updatedStatistics = {
        ...player.statistics,
        [currentDate]: {
          ...currentStats,
          loses: (currentStats.loses || 0) + (gameDetails.gameStatus === 'decided' ? 1 : 0),
          games: (currentStats.games || 0) + 1,
          draws: (currentStats.draws || 0) + (gameDetails.gameStatus === 'decided' ? 0 : 1),
        },
      };

      return {
        ...player,
        statistics: updatedStatistics,
      };
    });

    // Update the teams
    this.playersService.teams.set({
      ...this.playersService.teams(),
      // @ts-ignore
      [gameDetails.winner]: { ...this.playersService.teams()[gameDetails.winner], players: winners },
      // @ts-ignore
      [gameDetails.loser]: { ...this.playersService.teams()[gameDetails.loser], players: losers },
    });

    this.isTeamWinModalVisible.set(false);
  }

  codeModalSubmitted() {
    this.isAdminCodeModalVisible.set(false);
    if(this.code === '2626') {
      this.isAdminMode.set(!this.isAdminMode());
    }
    this.code = '';
  }

  ngOnInit(): void {
    // this.playersApiService.getPlayers().subscribe(val => console.log(val))
    // this.addPlayerFirebase().then(() => console.log('done'));
  }

  addPlayerFirebase() {
    // return this.playersApiService.addPlayer({
    //   name: 'yois',
    //   rating: 9,
    //   statistics: {
    //     "2024-01-01": {
    //       goals: 9,
    //       wins: 5,
    //       draws: 9,
    //       games: 9
    //     },
    //     "2024-02-01": {
    //       goals: 9,
    //       wins: 5,
    //       draws: 9,
    //       games: 9
    //     },
    //   }
    // })
  }
}
