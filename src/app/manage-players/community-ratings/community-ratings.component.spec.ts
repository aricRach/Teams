import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityRatingsComponent } from './community-ratings.component';

describe('CommunityRatingsComponent', () => {
  let component: CommunityRatingsComponent;
  let fixture: ComponentFixture<CommunityRatingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityRatingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunityRatingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
