import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { getDraftSessionsByOwnerResolver } from './get-draft-sessions-by-owner.resolver';

describe('getDraftSessionsByOwnerResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) =>
      TestBed.runInInjectionContext(() => getDraftSessionsByOwnerResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
