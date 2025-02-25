import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';

import { getGroupPlayersResolver } from './get-group-players.resolver';

describe('getGroupPlayersResolver', () => {
  const executeResolver: ResolveFn<boolean> = (...resolverParameters) => 
      TestBed.runInInjectionContext(() => getGroupPlayersResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
