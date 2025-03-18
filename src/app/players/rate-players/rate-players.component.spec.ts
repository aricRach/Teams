import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RatePlayersComponent } from './rate-players.component';

describe('RatePlayersComponent', () => {
  let component: RatePlayersComponent;
  let fixture: ComponentFixture<RatePlayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatePlayersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RatePlayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
