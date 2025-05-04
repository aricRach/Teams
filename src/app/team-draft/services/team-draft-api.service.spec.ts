import { TestBed } from '@angular/core/testing';

import { TeamDraftApiService } from './team-draft-api.service';

describe('TeamDraftApiService', () => {
  let service: TeamDraftApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeamDraftApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
