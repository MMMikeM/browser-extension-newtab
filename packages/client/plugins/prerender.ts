import { build as viteBuild } from "vite";
import viteReact from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { PluginOption } from "vite";

export const prerender = (): PluginOption => {
  const root = resolve(import.meta.dirname, "..");
  const outDir = join(root, "dist");
  const ssrTmp = join(root, ".ssr-tmp");

  return {
    name: "prerender",
    apply: "build",
    async closeBundle() {
      if (this.environment?.name !== "client") return;

      // Build a Node-runnable SSR bundle from entry-server.tsx.
      // viteReact() is required for the new JSX transform (react/jsx-runtime).
      // Babel/React Compiler is intentionally excluded — SSR only, no optimisation needed.
      await viteBuild({
        configFile: false,
        root,
        plugins: [viteReact()],
        resolve: { alias: { "~": join(root, "src") } },
        build: {
          ssr: join(root, "src", "entry-server.tsx"),
          outDir: ssrTmp,
          emptyOutDir: true,
        },
        ssr: { noExternal: true }, // bundle @newtab-todo/shared and other workspace deps
        logLevel: "warn",
      });

      // pathToFileURL required on Linux for import() to resolve absolute paths correctly
      const { render } = await import(pathToFileURL(join(ssrTmp, "entry-server.js")).href);
      const html: string = await render();

      const indexPath = join(outDir, "index.html");
      const template = readFileSync(indexPath, "utf-8");
      const injected = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
      if (injected === template)
        throw new Error('prerender: <div id="root"> not found in index.html');
      writeFileSync(indexPath, injected);

      rmSync(ssrTmp, { recursive: true, force: true });
      console.log("  Prerendered index.html");
    },
  };
};
