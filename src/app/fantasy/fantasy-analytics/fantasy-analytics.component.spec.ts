import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FantasyAnalyticsComponent } from './fantasy-analytics.component';

describe('FantasyAnalyticsComponent', () => {
  let component: FantasyAnalyticsComponent;
  let fixture: ComponentFixture<FantasyAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FantasyAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
