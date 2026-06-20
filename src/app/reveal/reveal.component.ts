import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamScoreBarsComponent } from '../shared/team-score-bars/team-score-bars.component';
import { RevealService } from './reveal.service';

@Component({
  selector: 'app-reveal',
  standalone: true,
  imports: [TeamScoreBarsComponent],
  templateUrl: './reveal.component.html',
  styleUrl: './reveal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RevealService],
})
export class RevealComponent implements OnInit {
  private route = inject(ActivatedRoute);
  readonly reveal = inject(RevealService);

  ngOnInit() {
    const groupId = this.route.snapshot.queryParams['groupId'];
    if (groupId) this.reveal.start(groupId);
  }
}
