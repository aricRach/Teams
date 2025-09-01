import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageFantasyMetaComponent } from './manage-fantasy-meta.component';

describe('ManageFantasyMetaComponent', () => {
  let component: ManageFantasyMetaComponent;
  let fixture: ComponentFixture<ManageFantasyMetaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageFantasyMetaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageFantasyMetaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
