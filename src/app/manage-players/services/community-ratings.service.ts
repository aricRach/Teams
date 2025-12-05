import {computed, inject, Injectable, signal} from '@angular/core';
import {PlayersService} from '../../players/players.service';
import {finalize, map} from 'rxjs';
import {CommunityRatingsApiService} from './community-ratings-api.service';
import {SpinnerService} from '../../spinner.service';
import {Router} from '@angular/router';
import {ModalsService} from 'ui';

export interface PlayerRating {
  name: string;
  rating: number;
  count: number;
}
export interface RatingsMap {
  [playerId: string]: PlayerRating;
}
@Injectable()
export class CommunityRatingsService {

  playersService = inject(PlayersService);
  communityRatingsApiService = inject(CommunityRatingsApiService);
  spinnerService = inject(SpinnerService);
  router = inject(Router);
  modalsService = inject(ModalsService);

  ratings = signal<RatingsMap>({} as RatingsMap);
  dataRows = computed(() => {
      return Object.entries(this.ratings()).map(([key, value]: [string, PlayerRating]) => {
        return {
          name: {value: value.name},
          rating: {value: value.rating},
          count: {value: value.count}
        }
      })
  })
  columns = signal([
    {
      alias: 'name',
      property: 'name',
      isFilterDisabled: false,
      isSortDisabled: false
    },
    {
      alias: 'rating',
      property: 'rating',
      isFilterDisabled: false,
      isSortDisabled: false
    },
    {
      alias: 'count',
      property: 'count',
      isFilterDisabled: false,
      isSortDisabled: false
    }
  ])
  config = signal({
    numberOfColumns: 3
  })

  setRatings(ratings: RatingsMap) {
    this.ratings.set(ratings)
  }
  getAverageRatings() {
    this.spinnerService.setIsLoading(true);
     return this.communityRatingsApiService.getAverageRatings(this.playersService.selectedGroup().id)
      .pipe(
        finalize(() => {
          this.spinnerService.setIsLoading(false)
        }),
      map((ratingDocs) => {
        const totals: Record<string, { sum: number; count: number, name: string }> = {};
        for (const userRating of ratingDocs) {
          for (const [playerId, ratingObj] of Object.entries(userRating)) {
            const rating = ratingObj.rating;
            if (!totals[playerId]) {
              totals[playerId] = { sum: 0, count: 0, name: ratingObj.name };
            }

            totals[playerId].sum += rating;
            totals[playerId].count += 1;
          }
        }

        const averages: Record<string, PlayerRating> = {};
        for (const playerId in totals) {
          const { sum, count, name } = totals[playerId];
          averages[playerId] = {
            rating: Number((sum/count).toFixed(2)),
            name,
            count,
          }
        }

        return averages;
      })
    )
  }

  updateCommunityRatings() {
    this.modalsService.openConfirmModal({
      title: 'Are you sure?',
      description: 'By confirm all the existing ratings of this players will be override.'
    }).afterClosed().subscribe((confirm) => {
      if(confirm) {
        this.spinnerService.setIsLoading(true);
        this.communityRatingsApiService.setCommunityRatings(this.playersService.selectedGroup().id, this.ratings())
          .then(() => {
            this.router.navigate(['/home/players'])
          })
          .finally(() => {
            this.spinnerService.setIsLoading(false);
          });
      }
    })
  }
}
