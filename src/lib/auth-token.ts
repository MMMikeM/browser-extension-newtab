import { observable, observe } from "@legendapp/state";
import { TOKEN_KEY } from "~/lib/constants";
import { getBuildTarget } from "~/lib/build-target";
import { ensurePushRegistered } from "~/lib/push";

const isServer = typeof window === "undefined";

export const authToken$ = observable<string | null>(
  isServer ? null : localStorage.getItem(TOKEN_KEY),
);

if (!isServer) {
  window.addEventListener("storage", (e) => {
    if (e.key === TOKEN_KEY) authToken$.set(e.newValue);
  });

  const target = getBuildTarget();

  if (target === "browser") {
    observe(() => {
      if (authToken$.get()) ensurePushRegistered();
    });
  }

  if (target === "extension") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) browser.storage.local.set({ [TOKEN_KEY]: token });
  }
}
