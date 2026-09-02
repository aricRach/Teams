import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {AddNewPlayerService} from './services/add-new-player.service';
import {ReactiveFormsModule} from '@angular/forms';
import {PLAYER_NAME_MAX_LENGTH} from '../players/models/player.model';

@Component({
  selector: 'app-add-new-player',
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './add-new-player.component.html',
  standalone: true,
  styleUrl: './add-new-player.component.scss'
})
export class AddNewPlayerComponent {

  readonly playerNameMaxLength = PLAYER_NAME_MAX_LENGTH;
  addNewPlayerService = inject(AddNewPlayerService);
  @ViewChild('nameField') nameField!: ElementRef;

  async submitAddNewPlayer() {
    await this.addNewPlayerService.addNewPlayer();
    this.nameField.nativeElement.focus();
  }
}
