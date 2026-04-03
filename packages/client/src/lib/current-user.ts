import { useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import { createExternalStore } from "~/lib/external-store";

const ID_KEY = "newtab-todo-user-id";
const INFO_KEY = "newtab-todo-user-info";
const DEVICE_ID_KEY = "newtab-todo-device-id";

const getOrCreateDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${nanoid()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
}

const loadUser = (): CurrentUser | null => {
  const raw = localStorage.getItem(INFO_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* fall through */
    }
  }
  const id = localStorage.getItem(ID_KEY);
  return id ? { id, name: "", username: "" } : null;
};

const store = createExternalStore<CurrentUser | null>(loadUser());

export const getCurrentUserId = () => store.get()?.id ?? getOrCreateDeviceId();
export const setCurrentUser = (user: CurrentUser) => {
  localStorage.setItem(ID_KEY, user.id);
  localStorage.setItem(INFO_KEY, JSON.stringify(user));
  store.set(user);
};

export const clearCurrentUser = () => {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(INFO_KEY);
  store.set(null);
};

export const useCurrentUser = store.useStore;

export const useCurrentUserId = () =>
  useSyncExternalStore(store.subscribe, () => store.get()?.id ?? null);
