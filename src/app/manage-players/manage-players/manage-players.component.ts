import {Component, inject} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ManagePlayersService} from '../services/manage-players.service';
import {FormsModule} from '@angular/forms';
import {AutoCompleteComponent} from 'ui';

@Component({
  selector: 'app-manage-players',
  imports: [FormsModule, RouterModule, AutoCompleteComponent],
  providers: [ManagePlayersService],
  templateUrl: './manage-players.component.html',
  styleUrl: './manage-players.component.scss'
})
export class ManagePlayersComponent {
  managePlayersService = inject(ManagePlayersService);
}
