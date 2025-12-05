import { TestBed } from '@angular/core/testing';

import { CommunityRatingsService } from './community-ratings.service';

describe('CommunityRatingsService', () => {
  let service: CommunityRatingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommunityRatingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
