import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunnyPageComponent } from './funny-page.component';

describe('FunnyPageComponent', () => {
  let component: FunnyPageComponent;
  let fixture: ComponentFixture<FunnyPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunnyPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunnyPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
