import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FantasyDraftComponent } from './fantasy-draft.component';

describe('FantasyDraftComponent', () => {
  let component: FantasyDraftComponent;
  let fixture: ComponentFixture<FantasyDraftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FantasyDraftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FantasyDraftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
