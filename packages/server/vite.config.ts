import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    platform: "node",
    target: "node24",
    clean: true,
    // Keep dist/index.js (start script + Dockerfile CMD); tsdown defaults to .mjs on node
    fixedExtension: false,
    dts: false,
    deps: {
      // Workspace package exports .ts sources directly with no build step — force-bundle it
      alwaysBundle: [/^@newtab-todo\/shared(\/|$)/],
      // Native addons and WASM cannot be bundled — must stay in node_modules
      neverBundle: ["@node-rs/argon2", "@libsql/client"],
    },
  },
});
