import { TestBed } from '@angular/core/testing';

import { CommunityRatingsApiService } from './community-ratings-api.service';

describe('CommunityRatingsApiService', () => {
  let service: CommunityRatingsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommunityRatingsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
