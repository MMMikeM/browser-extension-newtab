/**
 * Service worker build: bundles src/sw.ts + injects Workbox precache manifest.
 *
 * Runs after the main build so .output/public/ has all client assets.
 *
 * Usage: vite build && vite build -c vite.sw.config.ts
 */
import { defineConfig } from "vite";
import { existsSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { injectManifest } from "workbox-build";

const ROOT = resolve(import.meta.dirname);
const OUTPUT_PUBLIC = join(ROOT, ".output", "public");

const injectWorkboxManifest = async () => {
  const swDest = join(OUTPUT_PUBLIC, "sw.js");
  if (!existsSync(swDest)) return;

  const manifestSrc = join(ROOT, "public", "manifest.webmanifest");
  const manifestDest = join(OUTPUT_PUBLIC, "manifest.webmanifest");
  if (!existsSync(manifestDest) && existsSync(manifestSrc)) {
    copyFileSync(manifestSrc, manifestDest);
  }

  const { count, size } = await injectManifest({
    swSrc: swDest,
    swDest,
    injectionPoint: '"__WB_MANIFEST__"',
    globDirectory: OUTPUT_PUBLIC,
    globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
    globIgnores: ["sw.js"],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  });

  console.log(`Service worker generated: ${count} precached files (${Math.round(size / 1024)} KB)`);
};

export default defineConfig({
  resolve: {
    alias: { "~": join(ROOT, "src") },
  },
  define: {
    // Rolldown compiles away self.__WB_MANIFEST (evaluates as undefined).
    // Replace with a string literal that survives bundling, then tell workbox
    // to find that string instead.
    "self.__WB_MANIFEST": '"__WB_MANIFEST__"',
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: join(ROOT, "src", "sw.ts"),
      formats: ["umd"],
      name: "sw",
      fileName: () => "sw.js",
    },
    outDir: OUTPUT_PUBLIC,
    emptyOutDir: false,
    minify: false,
    rollupOptions: { output: { entryFileNames: "sw.js" } },
  },
  logLevel: "warn",
  plugins: [
    {
      name: "inject-workbox",
      async closeBundle() {
        await injectWorkboxManifest();
      },
    },
  ],
});
