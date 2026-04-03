import { resolve, join } from "node:path";
import { existsSync, copyFileSync } from "node:fs";
import { build } from "vite";
import { injectManifest } from "workbox-build";
import type { PluginOption } from "vite";

/**
 * Vite plugin: generates the service worker with Workbox precache manifest.
 *
 * Runs in closeBundle of the client environment build — after Vite writes
 * client assets to dist/client/.
 */
export const generateSW = (): PluginOption => {
  const root = resolve(import.meta.dirname, "..");
  const outputPublic = join(root, "dist", "client");
  const swSrc = join(root, "src", "sw.ts");
  const manifestSrc = join(root, "public", "manifest.webmanifest");

  return {
    name: "generate-sw",
    apply: "build",
    async closeBundle() {
      if (this.environment?.name !== "client") return;
      if (!existsSync(outputPublic)) return;

      const manifestDest = join(outputPublic, "manifest.webmanifest");
      if (!existsSync(manifestDest) && existsSync(manifestSrc)) {
        copyFileSync(manifestSrc, manifestDest);
      }

      await build({
        configFile: false,
        root,
        resolve: { alias: { "~": join(root, "src") } },
        define: {
          "self.__WB_MANIFEST": '"__WB_MANIFEST__"',
          "process.env.NODE_ENV": JSON.stringify("production"),
        },
        build: {
          lib: {
            entry: swSrc,
            formats: ["umd"],
            name: "sw",
            fileName: () => "sw.js",
          },
          outDir: outputPublic,
          emptyOutDir: false,
          minify: false,
          rollupOptions: { output: { entryFileNames: "sw.js" } },
        },
        logLevel: "warn",
      });

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

      console.log(
        `Service worker generated: ${count} precached files (${Math.round(size / 1024)} KB)`,
      );
    },
  };
};
