import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { PluginOption } from "vite";

/**
 * Vite plugin: injects <link rel="preload"> hints for the critical fonts.
 *
 * Font filenames are content-hashed by Vite so they can't be hardcoded in
 * index.html. This plugin runs after the bundle is written, globs the
 * dist/assets directory for the fonts we actually care about (latin subsets
 * of Figtree and DM Serif Display — the ones used on every render), and
 * injects preload hints into the built index.html.
 *
 * Only the latin (non-ext) subsets are preloaded — latin-ext, cyrillic,
 * greek etc. are only needed for non-Latin text and should load on demand.
 */
export const injectFontPreloads = (): PluginOption => {
  const root = resolve(import.meta.dirname, "..");
  const outDir = join(root, "dist");

  // Match only the critical Latin subsets (not latin-ext or other scripts)
  const isCriticalFont = (name: string) =>
    (name.startsWith("figtree-latin-wght-normal-") ||
      name.startsWith("dm-serif-display-latin-400-normal-")) &&
    name.endsWith(".woff2");

  return {
    name: "inject-font-preloads",
    apply: "build",
    closeBundle() {
      if (this.environment?.name !== "client") return;

      const assetsDir = join(outDir, "assets");
      let files: string[];
      try {
        files = readdirSync(assetsDir);
      } catch {
        return;
      }

      const preloadLinks = files
        .filter(isCriticalFont)
        .map(
          (f) =>
            `  <link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/${f}">`,
        )
        .join("\n");

      if (!preloadLinks) return;

      const indexPath = join(outDir, "index.html");
      const html = readFileSync(indexPath, "utf-8");
      const injected = html.replace("</head>", `${preloadLinks}\n</head>`);
      if (injected === html)
        throw new Error("inject-font-preloads: </head> not found in index.html");
      writeFileSync(indexPath, injected);

      console.log("  Injected font preload hints");
    },
  };
};
