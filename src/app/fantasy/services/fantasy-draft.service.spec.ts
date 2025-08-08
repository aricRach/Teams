import { TestBed } from '@angular/core/testing';

import { FantasyDraftService } from './fantasy-draft.service';

describe('FantasyDraftService', () => {
  let service: FantasyDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FantasyDraftService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
