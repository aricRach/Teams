import { TestBed } from '@angular/core/testing';

import { RegisterPlayersService } from './register-players.service';

describe('RegisterPlayersService', () => {
  let service: RegisterPlayersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegisterPlayersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
