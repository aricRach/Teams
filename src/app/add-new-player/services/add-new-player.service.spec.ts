import { TestBed } from '@angular/core/testing';

import { AddNewPlayerService } from './add-new-player.service';

describe('AddNewPlayerService', () => {
  let service: AddNewPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddNewPlayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
