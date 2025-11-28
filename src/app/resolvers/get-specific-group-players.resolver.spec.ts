import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { getSpecificGroupPlayersResolver } from './get-specific-group-players.resolver';

describe('getSpecificGroupPlayersResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => getSpecificGroupPlayersResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
