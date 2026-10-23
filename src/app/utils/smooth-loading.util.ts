import {DestroyRef, effect, inject, Signal, signal, untracked} from '@angular/core';

export interface SmoothLoadingOptions {
  delay?: number;
  minDuration?: number;
}

export function smoothLoading(isLoading: Signal<boolean>, {delay = 200, minDuration = 400}: SmoothLoadingOptions = {}): Signal<boolean> {
  const showSkeleton = signal(false);
  let shownAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  effect(() => {
    const loading = isLoading();
    untracked(() => {
      clearTimer();
      if (loading) {
        if (!showSkeleton()) {
          timer = setTimeout(() => {
            shownAt = Date.now();
            showSkeleton.set(true);
          }, delay);
        }
      } else if (showSkeleton()) {
        const remaining = minDuration - (Date.now() - shownAt);
        if (remaining > 0) {
          timer = setTimeout(() => showSkeleton.set(false), remaining);
        } else {
          showSkeleton.set(false);
        }
      }
    });
  });

  inject(DestroyRef).onDestroy(clearTimer);

  return showSkeleton.asReadonly();
}
