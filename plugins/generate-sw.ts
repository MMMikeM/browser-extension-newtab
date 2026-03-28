import { resolve, join } from "node:path";
import { existsSync, copyFileSync } from "node:fs";
import { build } from "vite";
import { injectManifest } from "workbox-build";
import type { PluginOption } from "vite";

/**
 * Vite plugin: generates the service worker with Workbox precache manifest.
 *
 * Runs after Vite writes client assets to .output/public/ but before Nitro
 * bundles static assets. This ensures the real sw.js (not a placeholder)
 * is included in Nitro's static asset manifest.
 */
export const generateSW = (): PluginOption => {
  const root = resolve(import.meta.dirname, "..");
  const outputPublic = join(root, ".output", "public");
  const swSrc = join(root, "src", "sw.ts");
  const manifestSrc = join(root, "public", "manifest.webmanifest");

  return {
    name: "generate-sw",
    apply: "build",
    async closeBundle() {
      if (!existsSync(outputPublic)) return;

      // Copy manifest if not already there from public/
      const manifestDest = join(outputPublic, "manifest.webmanifest");
      if (!existsSync(manifestDest) && existsSync(manifestSrc)) {
        copyFileSync(manifestSrc, manifestDest);
      }

      // Bundle SW source to JS
      // Rolldown compiles away self.__WB_MANIFEST (evaluates as undefined).
      // Use define to replace it with a string literal that survives bundling,
      // then tell workbox's injectManifest to find that string instead.
      await build({
        configFile: false,
        root,
        define: {
          "self.__WB_MANIFEST": '"__WB_MANIFEST__"',
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        build: {
          lib: {
            entry: swSrc,
            formats: ["es"],
            fileName: () => "sw.js",
          },
          outDir: outputPublic,
          emptyOutDir: false,
          minify: false,
          rollupOptions: {
            output: {
              entryFileNames: "sw.js",
            },
          },
        },
        logLevel: "warn",
      });

      // Inject precache manifest
      const swDest = join(outputPublic, "sw.js");
      const { count, size } = await injectManifest({
        swSrc: swDest,
        swDest,
        injectionPoint: '"__WB_MANIFEST__"',
        globDirectory: outputPublic,
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        globIgnores: ["sw.js"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      });

      console.log(`Service worker generated: ${count} precached files (${Math.round(size / 1024)} KB)`);
    },
  };
};
