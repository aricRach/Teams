import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateDraftSessionComponent } from './create-draft-session.component';

describe('CreateDraftSessionComponent', () => {
  let component: CreateDraftSessionComponent;
  let fixture: ComponentFixture<CreateDraftSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateDraftSessionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateDraftSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
