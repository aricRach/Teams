import { TestBed } from '@angular/core/testing';

import { FantasyApiService } from './fantasy-api.service';

describe('FantasyApiService', () => {
  let service: FantasyApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FantasyApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
