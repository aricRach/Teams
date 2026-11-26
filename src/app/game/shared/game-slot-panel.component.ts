import { Component, effect, input, output, viewChild } from '@angular/core';
import { StopwatchComponent } from '../../stopwatch/stopwatch.component';
import { TeamLabelPipe } from '../../pipes/team-label.pipe';
import { TeamColorDirective } from '../../directives/team-color.directive';

export interface PanelScorer {
  name: string;
  minute: number | null | undefined;
  teamKey?: string;
  isOwnGoal?: boolean;
}

@Component({
  selector: 'app-game-slot-panel',
  standalone: true,
  imports: [StopwatchComponent, TeamLabelPipe, TeamColorDirective],
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
  colors = input<Record<string, string>>({});
  showTimer = input(true);
  label = input('Game');
  /** True when only one game can be played, so teams are picked with a single Play toggle instead of G1/G2 buttons. */
  singleSlot = input(false);
  mode = input<'single' | 'league' | null>(null);
  squad = input<Record<string, string[]>>({});

  start = output<void>();
  reset = output<void>();
  end = output<void>();

  /** When a live game started. Set for games resumed after a refresh, so the timer continues from there. */
  startedAtMs = input<number | null>(null);

  readonly stopwatch = viewChild(StopwatchComponent);

  constructor() {
    // A game started on this page already has a running (or paused) timer, so this only
    // starts the timer of a live game whose page was just opened.
    // An effect because the stopwatch only exists once the panel has rendered its two teams, which can be
    // after the game became live, so there's no single action to start it from.
    effect(() => {
      const stopwatch = this.stopwatch();
      const startedAtMs = this.startedAtMs();
      if (this.live() && stopwatch && startedAtMs && stopwatch.isUnused()) {
        stopwatch.resumeFrom(Date.now() - startedAtMs);
      }
    });
  }

  scorersFor(teamKey: string | undefined): PanelScorer[] {
    return this.scorers().filter((s) => s.teamKey === teamKey);
  }

  squadFor(teamKey: string | undefined): string[] {
    return (teamKey && this.squad()[teamKey]) || [];
  }
}
