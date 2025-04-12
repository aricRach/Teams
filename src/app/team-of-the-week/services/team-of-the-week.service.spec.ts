import { TestBed } from '@angular/core/testing';

import { TeamOfTheWeekService } from './team-of-the-week.service';

describe('TeamOfTheWeekService', () => {
  let service: TeamOfTheWeekService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeamOfTheWeekService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
