/**
 * Extension build: bundles background.ts + assembles dist/extension/.
 *
 * Runs after the main build so dist/client/ has all client assets.
 *
 * SERVER_URL controls the remote server for background SSE + task sync.
 *
 * Usage: vite build && vite build -c vite.extension.config.ts
 */
import { defineConfig, loadEnv } from "vite";
import { readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname);
const OUTPUT_PUBLIC = join(ROOT, "dist", "client");
const EXT_OUT = join(ROOT, "dist", "extension");

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
  content_security_policy: "script-src 'self' 'unsafe-eval'; object-src 'self'; connect-src 'self' https:",
  permissions: ["storage"],
  background: {
    scripts: ["background.js"],
    persistent: true,
  },
};

const assembleExtension = () => {
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
  const inlineScriptRegex = /<script([^>]*)>([\s\S]+?)<\/script>/g;

  html = html.replace(inlineScriptRegex, (match, attrs: string, content: string) => {
    if (attrs.includes("src=")) return match;
    if (!content.trim()) return match;

    const filename = `_inline-${scriptIndex++}.js`;
    writeFileSync(join(EXT_OUT, filename), content);

    const typeMatch = attrs.match(/type="([^"]*)"/);
    const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : "";
    const asyncAttr = attrs.includes("async") ? " async" : "";

    return `<script${typeAttr}${asyncAttr} src="/${filename}"></script>`;
  });

  writeFileSync(join(EXT_OUT, "index.html"), html);
  console.log(`Extension assembled: ${scriptIndex} inline script(s) extracted`);
  console.log(`Extension built to ${EXT_OUT}`);
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT, "");
  const serverUrl = env.SERVER_URL || "http://localhost:3000";

  return {
    resolve: {
      alias: { "~": join(ROOT, "src") },
    },
    define: {
      __SERVER_URL__: JSON.stringify(serverUrl),
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
      rollupOptions: { output: { entryFileNames: "background.js" } },
    },
    logLevel: "warn",
    plugins: [
      {
        name: "assemble-extension",
        closeBundle() {
          assembleExtension();
        },
      },
    ],
  };
});
