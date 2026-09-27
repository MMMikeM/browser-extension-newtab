import { useSyncExternalStore } from "react";

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
