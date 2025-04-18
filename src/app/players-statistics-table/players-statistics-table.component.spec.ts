import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayersStatisticsTableComponent } from './players-statistics-table.component';

describe('PlayersStatisticsTableComponent', () => {
  let component: PlayersStatisticsTableComponent;
  let fixture: ComponentFixture<PlayersStatisticsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayersStatisticsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayersStatisticsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
