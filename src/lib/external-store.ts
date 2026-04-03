import { useSyncExternalStore } from "react";

/**
 * Minimal reactive store for module-level state.
 * Provides a getter, setter, listener set, and a React hook
 * via useSyncExternalStore -- avoiding the repeated boilerplate
 * in auth-token.ts, active-category.ts, and current-user.ts.
 */
export const createExternalStore = <T>(initialValue: T) => {
  let value = initialValue;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());

  const get = () => value;

  const set = (next: T) => {
    value = next;
    notify();
  };

  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };

  const useStore = () => useSyncExternalStore(subscribe, get);

  return { get, set, subscribe, notify, useStore };
};
