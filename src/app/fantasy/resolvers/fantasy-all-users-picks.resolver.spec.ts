import { TestBed } from '@angular/core/testing';

import { fantasyAllUsersPicksResolver } from './fantasy-all-users-picks.resolver';

describe('fantasyAllUsersPicksResolver', () => {
  const executeResolver = () => TestBed.runInInjectionContext(() => fantasyAllUsersPicksResolver());

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
