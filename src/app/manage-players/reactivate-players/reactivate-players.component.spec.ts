import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactivatePlayersComponent } from './reactivate-players.component';

describe('ReactivatePlayersComponent', () => {
  let component: ReactivatePlayersComponent;
  let fixture: ComponentFixture<ReactivatePlayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactivatePlayersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactivatePlayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
