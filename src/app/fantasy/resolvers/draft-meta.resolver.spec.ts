import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { draftMetaResolver } from './draft-meta.resolver';
import { FantasyMeta } from '../services/fantasy-api.service';

describe('draftMetaResolver', () => {
  const executeResolver: ResolveFn<FantasyMeta> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => draftMetaResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
