import {Component, inject, OnInit} from '@angular/core';
import {TeamOfTheWeekService} from './services/team-of-the-week.service';

@Component({
  selector: 'app-team-of-the-week',
  imports: [],
  templateUrl: './team-of-the-week.component.html',
  standalone: true,
  styleUrl: './team-of-the-week.component.scss'
})
export class TeamOfTheWeekComponent implements OnInit {

  teamOfTheWeekService = inject(TeamOfTheWeekService);

  ngOnInit(): void {
    this.teamOfTheWeekService.getTeamOfTheWeek('01-02-2025').then((data) => {
      console.log(data)
    })
  }
}
