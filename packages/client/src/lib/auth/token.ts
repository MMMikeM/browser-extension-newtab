import { TOKEN_KEY } from "~/lib/constants";
import { getBuildTarget } from "~/lib/build-target";
import { createExternalStore } from "~/lib/external-store";

const store = createExternalStore<string | null>(
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
);

export const getAuthToken = store.get;

export const setAuthToken = (value: string | null) => {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);

  if (getBuildTarget() === "extension" && value) {
    browser.storage.local.set({ [TOKEN_KEY]: value }).catch(console.error);
  }

  store.set(value);
};

// Sync across tabs (browser only — window is undefined during SSR prerender)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY) store.set(e.newValue);
  });
}

export const subscribeAuthToken = store.subscribe;
export const useAuthToken = store.useStore;
