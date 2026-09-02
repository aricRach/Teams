import { TestBed } from '@angular/core/testing';

import { PlayersDragDropTableService } from './players-drag-drop-table.service';

describe('PlayersDragDropTableService', () => {
  let service: PlayersDragDropTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayersDragDropTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
