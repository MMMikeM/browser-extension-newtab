import { TOKEN_KEY } from "~/lib/constants";
import { getBuildTarget } from "~/lib/build-target";
import { createExternalStore } from "~/lib/external-store";

const store = createExternalStore<string | null>(localStorage.getItem(TOKEN_KEY));

export const getAuthToken = store.get;

export const setAuthToken = (value: string | null) => {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);

  if (getBuildTarget() === "extension" && value) {
    browser.storage.local.set({ [TOKEN_KEY]: value });
  }

  store.set(value);
};

// Sync across tabs
window.addEventListener("storage", (e) => {
  if (e.key === TOKEN_KEY) store.set(e.newValue);
});

export const subscribeAuthToken = store.subscribe;
export const useAuthToken = store.useStore;
