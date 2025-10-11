import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { adminControlGuard } from './admin-control.guard';

describe('adminControlGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => adminControlGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
