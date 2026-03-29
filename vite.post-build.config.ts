/**
 * Post-build config: runs after `vite build` completes (including prerendering).
 *
 * Handles everything that depends on the fully built .output/ directory:
 * 1. Service worker: bundles src/sw.ts + injects Workbox precache manifest
 * 2. Extension (when BUILD_EXTENSION=1): assembles .output/extension/ from
 *    client assets, writes MV2 manifest, extracts inline scripts for CSP,
 *    bundles background.ts
 *
 * Usage:
 *   vite build && vite build -c vite.post-build.config.ts
 */
import { defineConfig } from "vite";
import { readFileSync, writeFileSync, cpSync, rmSync, existsSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "vite";
import { injectManifest } from "workbox-build";

const ROOT = resolve(import.meta.dirname);
const OUTPUT_PUBLIC = join(ROOT, ".output", "public");
const EXT_OUT = join(ROOT, ".output", "extension");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

const EXTENSION_MANIFEST = {
  manifest_version: 2,
  name: "New Tab Todo",
  version: "1.0.0",
  browser_specific_settings: {
    gecko: { id: "newtab-todo@local" },
  },
  chrome_url_overrides: {
    newtab: "index.html",
  },
  content_security_policy: "script-src 'self'; object-src 'self'",
  permissions: ["storage"],
  background: {
    scripts: ["background.js"],
    persistent: true,
  },
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
    rollupOptions: {
      output: {
        entryFileNames: "sw.js",
      },
    },
  },
  logLevel: "warn",
  plugins: [
    {
      name: "post-build",
      async closeBundle() {
        // --- Service Worker: inject Workbox precache manifest ---
        const swDest = join(OUTPUT_PUBLIC, "sw.js");
        if (existsSync(swDest)) {
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

          console.log(
            `Service worker generated: ${count} precached files (${Math.round(size / 1024)} KB)`,
          );
        }

        // --- Extension ---
        if (!process.env.BUILD_EXTENSION) return;

        // Bundle background script
        await build({
          configFile: false,
          root: ROOT,
          resolve: {
            alias: { "~": join(ROOT, "src") },
          },
          define: {
            __SERVER_URL__: JSON.stringify(SERVER_URL),
            "process.env.NODE_ENV": JSON.stringify("production"),
          },
          build: {
            lib: {
              entry: join(ROOT, "src", "background.ts"),
              formats: ["iife"],
              name: "background",
              fileName: () => "background.js",
            },
            outDir: EXT_OUT,
            emptyOutDir: true,
            minify: false,
            rollupOptions: {
              output: {
                entryFileNames: "background.js",
              },
            },
          },
          logLevel: "warn",
        });

        // Copy client build output into extension dir (alongside background.js)
        cpSync(OUTPUT_PUBLIC, EXT_OUT, { recursive: true });

        // Write extension manifest
        writeFileSync(join(EXT_OUT, "manifest.json"), JSON.stringify(EXTENSION_MANIFEST, null, 2));

        // Strip PWA files
        rmSync(join(EXT_OUT, "sw.js"), { force: true });
        rmSync(join(EXT_OUT, "manifest.webmanifest"), { force: true });

        // Extract inline scripts for CSP compliance
        let html = readFileSync(join(EXT_OUT, "index.html"), "utf-8");
        let scriptIndex = 0;
        const inlineScriptRegex = /<script([^>]*)>([^<]+)<\/script>/g;

        html = html.replace(inlineScriptRegex, (match, attrs: string, content: string) => {
          if (attrs.includes("src=")) return match;
          if (!content.trim()) return match;

          const patchedContent = content.replace(
            /,async:(!0|true)\},children:"import\(\\"([^"]+)\\"\)"\}/g,
            (_m, asyncVal, importPath) => `,async:${asyncVal},src:"${importPath}"}}`,
          );

          if (patchedContent !== content) {
            console.log("  Patched TSR manifest: converted inline import() to src attribute");
          }

          const filename = `_inline-${scriptIndex++}.js`;
          writeFileSync(join(EXT_OUT, filename), patchedContent);

          const typeMatch = attrs.match(/type="([^"]*)"/);
          const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : "";
          const asyncAttr = attrs.includes("async") ? " async" : "";

          return `<script${typeAttr}${asyncAttr} src="/${filename}"></script>`;
        });

        writeFileSync(join(EXT_OUT, "index.html"), html);
        console.log(`Extension assembled: ${scriptIndex} inline script(s) extracted`);
        console.log(`Extension built to ${EXT_OUT}`);
      },
    },
  ],
});
