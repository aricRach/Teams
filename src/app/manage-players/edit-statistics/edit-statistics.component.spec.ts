import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStatisticsComponent } from './edit-statistics.component';

describe('EditStatisticsComponent', () => {
  let component: EditStatisticsComponent;
  let fixture: ComponentFixture<EditStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
