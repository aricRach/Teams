import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayersLandingPageComponent } from './players-landing-page.component';

describe('PlayersLandingPageComponent', () => {
  let component: PlayersLandingPageComponent;
  let fixture: ComponentFixture<PlayersLandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayersLandingPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayersLandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
