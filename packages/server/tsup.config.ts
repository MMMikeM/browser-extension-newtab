import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  bundle: true,
  clean: true,
  // Workspace package exports .ts sources directly with no build step — force-bundle it
  noExternal: ["@newtab-todo/shared"],
  // Native addons and WASM cannot be bundled — must stay in node_modules
  external: ["@node-rs/argon2", "@libsql/client"],
});
