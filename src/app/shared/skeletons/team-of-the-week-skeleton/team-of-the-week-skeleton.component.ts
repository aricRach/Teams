import {Component} from '@angular/core';

@Component({
  selector: 'app-team-of-the-week-skeleton',
  templateUrl: './team-of-the-week-skeleton.component.html',
  styleUrl: './team-of-the-week-skeleton.component.scss',
  host: {'aria-busy': 'true', 'aria-label': 'Loading team of the week'},
})
export class TeamOfTheWeekSkeletonComponent {
  protected readonly rows = [[1, 2], [1, 2, 3], [1, 2]];
  protected readonly reasonWidths = [92, 78, 85, 70, 88, 64, 80];
}
