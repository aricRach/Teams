import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { draftMetaResolver } from './draft-meta.resolver';

describe('draftMetaResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => draftMetaResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
