import { TestBed } from '@angular/core/testing';

import { PlayerProgressChartService } from './player-progress-chart.service';

describe('PlayerProgressChartService', () => {
  let service: PlayerProgressChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayerProgressChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
