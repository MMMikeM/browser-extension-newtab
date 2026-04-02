import { observable } from "@legendapp/state";

const KEY = "newtab-todo-user-id";

export const currentUserId$ = observable<string | null>(localStorage.getItem(KEY));

export const setCurrentUserId = (id: string) => {
  localStorage.setItem(KEY, id);
  currentUserId$.set(id);
};

export const clearCurrentUserId = () => {
  localStorage.removeItem(KEY);
  currentUserId$.set(null);
};
