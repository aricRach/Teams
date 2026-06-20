import { ChangeDetectionStrategy, Component, HostBinding, input } from '@angular/core';

@Component({
  selector: 'app-team-score-bars',
  standalone: true,
  imports: [],
  templateUrl: './team-score-bars.component.html',
  styleUrl: './team-score-bars.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamScoreBarsComponent {
  attackScore  = input<number>(0);
  defenseScore = input<number>(0);
  variant      = input<'dark' | 'light'>('dark');

  @HostBinding('class') get hostClass() { return this.variant(); }
}
