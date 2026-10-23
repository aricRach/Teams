import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {ManagePlayersService} from '../services/manage-players.service';
import {AutoCompleteComponent} from 'ui';
import {SectionLayoutComponent} from '../../shared/layouts/section-layout/section-layout.component';

@Component({
  selector: 'app-manage-players',
  imports: [AutoCompleteComponent, SectionLayoutComponent, RouterOutlet],
  providers: [ManagePlayersService],
  templateUrl: './manage-players.component.html',
  styleUrl: './manage-players.component.scss'
})
export class ManagePlayersComponent {
  managePlayersService = inject(ManagePlayersService);
}
