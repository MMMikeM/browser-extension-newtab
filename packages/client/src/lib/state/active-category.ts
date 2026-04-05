import { createExternalStore } from "~/lib/external-store";

const KEY = "newtab-todo-active-category";
const store = createExternalStore<string | null>(
  typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null,
);

export const getActiveCategoryId = store.get;

export const setActiveCategoryId = (id: string | null) => {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
  store.set(id);
};

export const useActiveCategoryId = store.useStore;
