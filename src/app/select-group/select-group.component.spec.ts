import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectGroupComponent } from './select-group.component';

describe('SelectGroupComponent', () => {
  let component: SelectGroupComponent;
  let fixture: ComponentFixture<SelectGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectGroupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
