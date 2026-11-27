import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { PopupsService } from 'ui';
import { PlayersService } from '../../players/players.service';
import { PlayersApiService } from '../../players/players-api.service';
import { MatchEventsApiService } from '../../match-event-manager/services/match-events-api.service';
import { AdminControlComponent } from './admin-control.component';

describe('AdminControlComponent', () => {
  let component: AdminControlComponent;
  let fixture: ComponentFixture<AdminControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminControlComponent],
      providers: [
        provideRouter([]),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        {
          provide: PlayersService,
          useValue: { groupUrl: () => '/home/group-1/manage-group', isGroupOwner: signal(false), selectedGroup: signal({ id: 'group-1' }) },
        },
        { provide: PlayersApiService, useValue: { deleteAllStatsAndSpecialCollections: () => Promise.resolve() } },
        { provide: MatchEventsApiService, useValue: { deleteAllFinishedMatches: () => Promise.resolve() } },
        { provide: PopupsService, useValue: { addSuccessPopOut: () => {}, addErrorPopOut: () => {} } },
      ],
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
