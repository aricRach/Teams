import { TestBed } from '@angular/core/testing';

import { RegisterPlayersApiService } from './register-players-api.service';

describe('RegisterPlayersApiService', () => {
  let service: RegisterPlayersApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegisterPlayersApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
