import { TestBed } from '@angular/core/testing';

import { AddNewPlayerApiService } from './add-new-player-api.service';

describe('AddNewPlayerApiService', () => {
  let service: AddNewPlayerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddNewPlayerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
