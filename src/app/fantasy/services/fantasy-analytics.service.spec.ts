import { TestBed } from '@angular/core/testing';

import { FantasyAnalyticsService } from './fantasy-analytics.service';

describe('FantasyAnalyticsService', () => {
  let service: FantasyAnalyticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FantasyAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
