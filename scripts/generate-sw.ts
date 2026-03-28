/**
 * Post-build script: generates the service worker with Workbox precache manifest.
 *
 * 1. Bundles src/sw.ts to JS via Vite's build API
 * 2. Copies web.webmanifest to .output/public/
 * 3. Runs workbox-build injectManifest to produce the final sw.js with precache manifest
 */

import { copyFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { build } from "vite";
import { injectManifest } from "workbox-build";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_PUBLIC = join(ROOT, ".output", "public");
const SW_SRC = join(ROOT, "src", "sw.ts");

if (!existsSync(OUTPUT_PUBLIC)) {
  console.error("Error: .output/public does not exist. Run vite build first.");
  process.exit(1);
}

// Copy web manifest
copyFileSync(
  join(ROOT, "manifests", "web.webmanifest"),
  join(OUTPUT_PUBLIC, "manifest.webmanifest"),
);
console.log("Copied manifest.webmanifest");

// Bundle SW source to JS via Vite
await build({
  configFile: false,
  root: ROOT,
  build: {
    lib: {
      entry: SW_SRC,
      formats: ["es"],
      fileName: () => "sw.js",
    },
    outDir: OUTPUT_PUBLIC,
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      output: {
        entryFileNames: "sw.js",
      },
    },
  },
  logLevel: "warn",
});

// Inject precache manifest
const swDest = join(OUTPUT_PUBLIC, "sw.js");
const { count, size } = await injectManifest({
  swSrc: swDest,
  swDest: swDest,
  globDirectory: OUTPUT_PUBLIC,
  globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
  globIgnores: ["sw.js"],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

console.log(`Service worker generated: ${count} precached files (${Math.round(size / 1024)} KB)`);
