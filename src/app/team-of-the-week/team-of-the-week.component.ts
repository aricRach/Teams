import {Component, computed, inject} from '@angular/core';
import {TeamOfTheWeekService} from './services/team-of-the-week.service';
import {JsonPipe} from '@angular/common';

interface PlayerPerformance {
  position: 'striker' | 'midfielder' | 'defender';
  player: string;
  reason: string;
  wins: number;
  goals: number;
  rating: number;
}

@Component({
  selector: 'app-team-of-the-week',
  imports: [],
  templateUrl: './team-of-the-week.component.html',
  standalone: true,
  styleUrl: './team-of-the-week.component.scss',
  providers: [TeamOfTheWeekService]
})
export class TeamOfTheWeekComponent {

  teamOfTheWeekService = inject(TeamOfTheWeekService);

  // Define custom position order
  positionOrder = {
    striker: 0,
    midfielder: 1,
    defender: 2
  };

  totwByPosition = computed(() => {
    const data = this.teamOfTheWeekService.totwData()?.explanation ?? [];

    const sorted = data.sort(
      (a: PlayerPerformance, b: PlayerPerformance) =>
        this.positionOrder[a.position] - this.positionOrder[b.position]
    );

    return {
      striker: sorted.filter((p: { position: string; }) => p.position.toLowerCase() === 'striker'),
      midfielder: sorted.filter((p: { position: string; }) => p.position.toLowerCase() === 'midfielder'),
      defender: sorted.filter((p: { position: string; }) => p.position.toLowerCase() === 'defender')
    };
  });

  totwDescription = computed(() : PlayerPerformance[] => this.teamOfTheWeekService.totwData()?.explanation.sort((a: PlayerPerformance, b: PlayerPerformance) => this.positionOrder[a.position] - this.positionOrder[b.position]))


  async reGenerateTotw() {
   await this.teamOfTheWeekService.reGenerateTeamOfTheWeek(this.teamOfTheWeekService.statisticService.getSelectedDate())
  }
}
