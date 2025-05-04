import { TestBed } from '@angular/core/testing';

import { CreateDraftSessionService } from './create-draft-session.service';

describe('CreateDraftSessionService', () => {
  let service: CreateDraftSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreateDraftSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
