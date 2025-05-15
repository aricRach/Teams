import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewPlayerComponent } from './add-new-player.component';

describe('AddNewPlayerComponent', () => {
  let component: AddNewPlayerComponent;
  let fixture: ComponentFixture<AddNewPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddNewPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddNewPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
