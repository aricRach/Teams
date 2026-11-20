import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatDialogRef } from '@angular/material/dialog';
import { AdminControlComponent } from './admin-control.component';

describe('AdminControlComponent', () => {
  let component: AdminControlComponent;
  let fixture: ComponentFixture<AdminControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlComponent],
      providers: [{ provide: MatDialogRef, useValue: { close: () => {} } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
