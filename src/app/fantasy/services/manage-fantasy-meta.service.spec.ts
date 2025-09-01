import { TestBed } from '@angular/core/testing';

import { ManageFantasyMetaService } from './manage-fantasy-meta.service';

describe('ManageFantasyMetaService', () => {
  let service: ManageFantasyMetaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ManageFantasyMetaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
