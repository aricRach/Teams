import { TestBed } from '@angular/core/testing';

import { ManagePlayersService } from './manage-players.service';

describe('ManagePlayersService', () => {
  let service: ManagePlayersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManagePlayersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
