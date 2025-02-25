import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { getUserGroupsResolver } from './get-user-groups.resolver';

describe('getUserGroupsResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => getUserGroupsResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
