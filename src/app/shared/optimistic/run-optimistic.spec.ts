import {signal} from '@angular/core';
import {createMutation, runOptimistic} from './run-optimistic';

describe('runOptimistic', () => {
  it('applies before the write and keeps the change when the write succeeds', async () => {
    const value = signal('old');
    const onError = jasmine.createSpy('onError');

    const result = await runOptimistic({
      apply: () => value.set('new'),
      rollback: () => value.set('old'),
      commit: async () => {
        expect(value()).toBe('new');
        return 'saved';
      },
      onError,
    });

    expect(result).toBe('saved');
    expect(value()).toBe('new');
    expect(onError).not.toHaveBeenCalled();
  });

  it('rolls back and reports when the write fails', async () => {
    const value = signal('old');
    const onError = jasmine.createSpy('onError');

    const result = await runOptimistic({
      apply: () => value.set('new'),
      rollback: () => value.set('old'),
      commit: () => Promise.reject(new Error('offline')),
      onError,
    });

    expect(result).toBeUndefined();
    expect(value()).toBe('old');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('createMutation', () => {
  it('is pending while it runs, then reports success with the result and the arguments', async () => {
    const onSuccess = jasmine.createSpy('onSuccess');
    const onError = jasmine.createSpy('onError');
    const action = createMutation({
      run: async (id: string) => {
        expect(action.pending()).toBeTrue();
        return `saved ${id}`;
      },
      onSuccess,
      onError,
    });

    expect(await action.run('a')).toBeTrue();
    expect(action.pending()).toBeFalse();
    expect(onSuccess).toHaveBeenCalledOnceWith('saved a', 'a');
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a failure through onError and resolves false instead of rejecting', async () => {
    const error = new Error('offline');
    const onSuccess = jasmine.createSpy('onSuccess');
    const onError = jasmine.createSpy('onError');
    const action = createMutation({run: (_id: string) => Promise.reject(error), onSuccess, onError});

    expect(await action.run('a')).toBeFalse();
    expect(action.pending()).toBeFalse();
    expect(onError).toHaveBeenCalledOnceWith(error, 'a');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('stays pending until the last of overlapping runs ends', async () => {
    let finishFirst!: () => void;
    const first = new Promise<void>(resolve => finishFirst = resolve);
    const action = createMutation({run: (wait: boolean) => wait ? first : Promise.resolve(), onError: () => {}});

    const slow = action.run(true);
    await action.run(false);
    expect(action.pending()).toBeTrue();

    finishFirst();
    await slow;
    expect(action.pending()).toBeFalse();
  });
});
