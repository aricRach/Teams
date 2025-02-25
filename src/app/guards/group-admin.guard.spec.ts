import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { groupAdminGuard } from './group-admin.guard';

describe('groupAdminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => groupAdminGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
