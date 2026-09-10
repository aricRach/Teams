import { Component, input, output, viewChild } from '@angular/core';
import { StopwatchComponent } from '../../stopwatch/stopwatch.component';
import { TeamLabelPipe } from '../../pipes/team-label.pipe';

export interface PanelScorer {
  name: string;
  minute: number | null | undefined;
  teamKey?: string;
}

/** Presentational: one slot's live score + scorers + stopwatch. Shared by single and league modes. */
@Component({
  selector: 'app-game-slot-panel',
  standalone: true,
  imports: [StopwatchComponent, TeamLabelPipe],
  templateUrl: './game-slot-panel.component.html',
  styleUrl: './game-slot-panel.component.scss'
})
export class GameSlotPanelComponent {
  slot = input.required<number>();
  teamKeys = input<string[]>([]);
  ready = input(false);
  live = input(false);
  score = input<Record<string, number>>({});
  scorers = input<PanelScorer[]>([]);
  aliases = input<Record<string, string>>({});

  start = output<void>();
  reset = output<void>();
  end = output<void>();

  readonly stopwatch = viewChild(StopwatchComponent);

  scorersFor(teamKey: string | undefined): PanelScorer[] {
    return this.scorers().filter((s) => s.teamKey === teamKey);
  }
}
