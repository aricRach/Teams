import {Component, inject} from '@angular/core';
import {RouterModule} from '@angular/router';
import {ManagePlayersService} from '../services/manage-players.service';
import {FormsModule} from '@angular/forms';
import {AutoCompleteComponent} from 'ui';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-manage-players',
  imports: [FormsModule, RouterModule, AutoCompleteComponent, MatTooltip,],
  providers: [ManagePlayersService],
  templateUrl: './manage-players.component.html',
  styleUrl: './manage-players.component.scss'
})
export class ManagePlayersComponent {
  managePlayersService = inject(ManagePlayersService);
}
