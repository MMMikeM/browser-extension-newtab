import { observable, observe } from "@legendapp/state";
import { TOKEN_KEY } from "~/lib/constants";
import { getBuildTarget } from "~/lib/build-target";
import { ensurePushRegistered } from "~/lib/push";

export const authToken$ = observable<string | null>(localStorage.getItem(TOKEN_KEY));

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
  const token = authToken$.peek();
  if (token) browser.storage.local.set({ [TOKEN_KEY]: token });
}
