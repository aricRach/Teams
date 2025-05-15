import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import {AddNewPlayerService} from './services/add-new-player.service';
import {ReactiveFormsModule} from '@angular/forms';

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

  addNewPlayerService = inject(AddNewPlayerService);
  @ViewChild('nameField') nameField!: ElementRef;

  submitAddNewPlayer() {
    this.addNewPlayerService.addNewPlayer();
    this.nameField.nativeElement.focus();
  }
}
