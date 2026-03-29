import { useNitroHooks } from "nitro/app";

declare module "nitro/types" {
  interface NitroRuntimeHooks {
    "tasks:changed": () => void;
  }
}

export const onTasksChanged = (fn: () => void) => useNitroHooks().hook("tasks:changed", fn);

export const broadcastChange = () => {
  console.log("[sse] broadcasting tasks:changed");
  useNitroHooks().callHook("tasks:changed");
};
