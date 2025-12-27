import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaptureMediaComponent } from './capture-media.component';

describe('CaptureMediaComponent', () => {
  let component: CaptureMediaComponent;
  let fixture: ComponentFixture<CaptureMediaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaptureMediaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaptureMediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
