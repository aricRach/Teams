import { TestBed } from '@angular/core/testing';

import { ReactivatePlayersService } from './reactivate-players.service';

describe('ReactivatePlayersService', () => {
  let service: ReactivatePlayersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReactivatePlayersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
