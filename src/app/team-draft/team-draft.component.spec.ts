import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamDraftComponent } from './team-draft.component';

describe('TeamDraftComponent', () => {
  let component: TeamDraftComponent;
  let fixture: ComponentFixture<TeamDraftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDraftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamDraftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
