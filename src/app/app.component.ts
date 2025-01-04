import {Component, ElementRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem, DragDropModule
} from '@angular/cdk/drag-drop';
import {CommonModule} from '@angular/common';

interface Player {
  name: string;
  rating: number;
}

interface Team {
  name: string;
  players: Player[];
  totalRating: number;
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, DragDropModule, CommonModule],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  playerForm!: FormGroup;
  hideRating = false;
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
      this.teams.allPlayers.players.push({ name, rating });
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
}
