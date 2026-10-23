import {computed, Signal, signal} from '@angular/core';

export interface OptimisticAction<T> {
  apply: () => void;
  rollback: () => void;
  commit: () => Promise<T>;
  onError: () => void;
}

export async function runOptimistic<T>(action: OptimisticAction<T>): Promise<T | undefined> {
  action.apply();
  try {
    return await action.commit();
  } catch {
    action.rollback();
    action.onError();
    return undefined;
  }
}

export interface MutationOptions<A extends unknown[], T> {
  run: (...args: A) => Promise<T>;
  onSuccess?: (result: T, ...args: A) => void;
  onError: (error: unknown, ...args: A) => void;
}

export interface Mutation<A extends unknown[]> {
  readonly pending: Signal<boolean>;
  run: (...args: A) => Promise<boolean>;
}

export function createMutation<A extends unknown[], T>(options: MutationOptions<A, T>): Mutation<A> {
  const inFlight = signal(0);
  return {
    pending: computed(() => inFlight() > 0),
    run: async (...args: A) => {
      inFlight.update(n => n + 1);
      try {
        const result = await options.run(...args);
        options.onSuccess?.(result, ...args);
        return true;
      } catch (error) {
        options.onError(error, ...args);
        return false;
      } finally {
        inFlight.update(n => n - 1);
      }
    },
  };
}
