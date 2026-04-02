import { observable } from "@legendapp/state";

const KEY = "newtab-todo-active-category";

export const activeCategoryId$ = observable<string | null>(localStorage.getItem(KEY));

export const setActiveCategoryId = (id: string | null) => {
  if (id) {
    localStorage.setItem(KEY, id);
  } else {
    localStorage.removeItem(KEY);
  }
  activeCategoryId$.set(id);
};
