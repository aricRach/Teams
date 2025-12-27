import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { groupOwnerGuard } from './group-owner.guard';

describe('groupOwnerGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => groupOwnerGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
