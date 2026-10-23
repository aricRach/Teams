import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SectionLayoutComponent} from '../../shared/layouts/section-layout/section-layout.component';
import {MatchesService} from '../services/matches.service';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [SectionLayoutComponent, RouterOutlet],
  templateUrl: './matches.component.html',
  styleUrl: './matches.component.scss',
})
export class MatchesComponent {

  matchesService = inject(MatchesService);
}
