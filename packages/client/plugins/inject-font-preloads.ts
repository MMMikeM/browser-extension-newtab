import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { PluginOption } from "vite";

// Vite content-hashes font filenames, so the preload hints can't be written into index.html
export const injectFontPreloads = (): PluginOption => {
  const root = resolve(import.meta.dirname, "..");
  const outDir = join(root, "dist");

  // Figtree and DM Serif Display render on every page. latin-ext and the other scripts are
  // only needed for non-Latin text, so they load on demand
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
