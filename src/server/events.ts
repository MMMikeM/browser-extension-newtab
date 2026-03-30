import { useNitroHooks } from "nitro/app";

declare module "nitro/types" {
  interface NitroRuntimeHooks {
    "data:changed": () => void;
  }
}

export const onDataChanged = (fn: () => void) => useNitroHooks().hook("data:changed", fn);

export const broadcastChange = () => {
  console.log("[sse] broadcasting data:changed");
  useNitroHooks().callHook("data:changed");
};
