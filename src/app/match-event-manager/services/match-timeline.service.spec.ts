import { TestBed } from '@angular/core/testing';

import { MatchTimelineService } from './match-timeline.service';

describe('MatchTimelineService', () => {
  let service: MatchTimelineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MatchTimelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
