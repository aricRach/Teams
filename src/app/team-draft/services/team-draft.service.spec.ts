import { TestBed } from '@angular/core/testing';

import { TeamDraftService } from './team-draft.service';

describe('TeamDraftService', () => {
  let service: TeamDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeamDraftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
