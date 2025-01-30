import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayersDragDropTableComponent } from './players-drag-drop-table.component';

describe('PlayersDragDropTableComponent', () => {
  let component: PlayersDragDropTableComponent;
  let fixture: ComponentFixture<PlayersDragDropTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayersDragDropTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayersDragDropTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
