import { TestBed } from '@angular/core/testing';

import { EditStatisticsService } from './edit-statistics.service';

describe('EditStatisticsService', () => {
  let service: EditStatisticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditStatisticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
