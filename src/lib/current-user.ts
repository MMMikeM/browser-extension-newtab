import { observable } from "@legendapp/state";

const ID_KEY = "newtab-todo-user-id";
const INFO_KEY = "newtab-todo-user-info";

export interface CurrentUser {
  id: string;
  name: string;
  username: string;
}

const loadUser = (): CurrentUser | null => {
  const raw = localStorage.getItem(INFO_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  const id = localStorage.getItem(ID_KEY);
  return id ? { id, name: "", username: "" } : null;
};

const stored = loadUser();

export const currentUserId$ = observable<string | null>(stored?.id ?? null);
export const currentUser$ = observable<CurrentUser | null>(stored);

export const setCurrentUser = (user: CurrentUser) => {
  localStorage.setItem(ID_KEY, user.id);
  localStorage.setItem(INFO_KEY, JSON.stringify(user));
  currentUserId$.set(user.id);
  currentUser$.set(user);
};

export const clearCurrentUserId = () => {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(INFO_KEY);
  currentUserId$.set(null);
  currentUser$.set(null);
};
