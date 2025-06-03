import { TestBed } from '@angular/core/testing';

import { EditPlayerService } from './edit-player.service';

describe('EditPlayerService', () => {
  let service: EditPlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditPlayerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
