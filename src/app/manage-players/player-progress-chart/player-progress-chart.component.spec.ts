import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerProgressChartComponent } from './player-progress-chart.component';

describe('PlayerProgressChartComponent', () => {
  let component: PlayerProgressChartComponent;
  let fixture: ComponentFixture<PlayerProgressChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerProgressChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerProgressChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
