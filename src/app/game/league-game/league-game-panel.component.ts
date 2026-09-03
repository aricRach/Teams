import { Component, input, output, viewChild } from '@angular/core';
import { StopwatchComponent } from '../../stopwatch/stopwatch.component';

export interface PanelScorer {
  name: string;
  minute: number | null | undefined;
  teamKey?: string;
}

@Component({
  selector: 'app-league-game-panel',
  standalone: true,
  imports: [StopwatchComponent],
  templateUrl: './league-game-panel.component.html',
  styleUrl: './league-game-panel.component.scss'
})
export class LeagueGamePanelComponent {
  slot = input.required<number>();
  teamKeys = input<string[]>([]);
  ready = input(false);
  live = input(false);
  score = input<Record<string, number>>({});
  scorers = input<PanelScorer[]>([]);

  start = output<void>();
  reset = output<void>();
  end = output<void>();

  readonly stopwatch = viewChild(StopwatchComponent);

  label(teamKey: string | undefined): string {
    if (!teamKey) return '?';
    return teamKey.replace(/^team/i, '').toUpperCase() || teamKey;
  }

  scorersFor(teamKey: string | undefined): PanelScorer[] {
    return this.scorers().filter((s) => s.teamKey === teamKey);
  }
}
