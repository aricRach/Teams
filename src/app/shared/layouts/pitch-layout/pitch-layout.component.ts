import {Component, input, output} from '@angular/core';
import {StateMessageComponent} from '../../state-message/state-message.component';
import {TeamOfTheWeekSkeletonComponent} from '../../skeletons/team-of-the-week-skeleton/team-of-the-week-skeleton.component';
import {smoothLoading} from '../../../utils/smooth-loading.util';

@Component({
  selector: 'app-pitch-layout',
  imports: [StateMessageComponent, TeamOfTheWeekSkeletonComponent],
  templateUrl: './pitch-layout.component.html',
  styleUrl: './pitch-layout.component.scss',
})
export class PitchLayoutComponent {
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly errorHeading = input<string>();
  readonly emptyHeading = input<string>();
  readonly emptyDetail = input<string>();
  readonly retry = output<void>();

  protected readonly showSkeleton = smoothLoading(this.loading);
}
