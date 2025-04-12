import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamOfTheWeekComponent } from './team-of-the-week.component';

describe('TeamOfTheWeekComponent', () => {
  let component: TeamOfTheWeekComponent;
  let fixture: ComponentFixture<TeamOfTheWeekComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamOfTheWeekComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamOfTheWeekComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
