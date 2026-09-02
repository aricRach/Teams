import {Component, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InnerTabsComponent, InnerTab } from '../../shared/inner-tabs/inner-tabs.component';
import {MatchesService} from '../services/matches.service';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [RouterOutlet, InnerTabsComponent],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss',
})
export class MatchesComponent {

  matchesService = inject(MatchesService);
}
