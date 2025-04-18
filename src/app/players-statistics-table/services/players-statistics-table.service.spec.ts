import { TestBed } from '@angular/core/testing';

import { PlayersStatisticsTableService } from './players-statistics-table.service';

describe('PlayersStatisticsTableService', () => {
  let service: PlayersStatisticsTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayersStatisticsTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
