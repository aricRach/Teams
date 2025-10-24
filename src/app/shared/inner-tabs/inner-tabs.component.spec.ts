import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnerTabsComponent } from './inner-tabs.component';

describe('InnerTabsComponent', () => {
  let component: InnerTabsComponent;
  let fixture: ComponentFixture<InnerTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnerTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnerTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
