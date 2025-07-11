import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPlayerStatisticsComponent } from './edit-player-statistics.component';

describe('EditStatisticsComponent', () => {
  let component: EditPlayerStatisticsComponent;
  let fixture: ComponentFixture<EditPlayerStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPlayerStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPlayerStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
