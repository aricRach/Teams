import { TestBed } from '@angular/core/testing';

import { ManageFantasyMetaApiService } from './manage-fantasy-meta-api.service';

describe('ManageFantasyMetaApiService', () => {
  let service: ManageFantasyMetaApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageFantasyMetaApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
