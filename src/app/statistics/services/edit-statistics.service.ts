import {inject, Injectable} from '@angular/core';
import {StatisticsService} from './statistics.service';

@Injectable({
  providedIn: 'root'
})
export class EditStatisticsService {

  statisticsService = inject(StatisticsService);

}
