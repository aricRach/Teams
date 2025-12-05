import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {CommunityRatingsService} from '../services/community-ratings.service';
import {JsonPipe, KeyValuePipe} from '@angular/common';
import {GridComponent} from 'ui';
import {finalize, first, lastValueFrom, Subscription, take} from 'rxjs';
import {SpinnerService} from '../../spinner.service';

@Component({
  selector: 'app-community-ratings',
  providers: [CommunityRatingsService],
  imports: [KeyValuePipe, JsonPipe, GridComponent],
  templateUrl: './community-ratings.component.html',
  styleUrl: './community-ratings.component.scss'
})
export class CommunityRatingsComponent implements OnInit, OnDestroy{

  communityRatingsService = inject(CommunityRatingsService);
  spinnerService = inject(SpinnerService);
  subscription = new Subscription();

  ngOnInit(): void {
    this.subscription.add(this.communityRatingsService.getAverageRatings().subscribe((ratings) => {
      this.communityRatingsService.setRatings(ratings);
      this.spinnerService.setIsLoading(false);
    }))
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
