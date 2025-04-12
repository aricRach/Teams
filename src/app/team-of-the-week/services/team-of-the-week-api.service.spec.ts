import { TestBed } from '@angular/core/testing';

import { TeamOfTheWeekApiService } from './team-of-the-week-api.service';

describe('TeamOfTheWeekApiService', () => {
  let service: TeamOfTheWeekApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeamOfTheWeekApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
