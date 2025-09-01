import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { fantasyAllUsersPicksResolver } from './fantasy-all-users-picks.resolver';

describe('usersPicksResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) =>
      TestBed.runInInjectionContext(() => fantasyAllUsersPicksResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
