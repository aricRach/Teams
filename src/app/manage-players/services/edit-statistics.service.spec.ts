import { TestBed } from '@angular/core/testing';

import { EditPlayerStatisticsService } from './edit-player-statistics.service';

describe('EditStatisticsService', () => {
  let service: EditPlayerStatisticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditPlayerStatisticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
