import { TestBed } from '@angular/core/testing';

import { inactivePlayersResolver } from './inactive-players.resolver';

describe('inactivePlayersResolver', () => {
  const executeResolver = () => TestBed.runInInjectionContext(() => inactivePlayersResolver());

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
