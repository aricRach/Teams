import { TestBed } from '@angular/core/testing';

import { EditStatisticsApiService } from './edit-statistics-api.service';

describe('EditStatisticsApiService', () => {
  let service: EditStatisticsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EditStatisticsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
