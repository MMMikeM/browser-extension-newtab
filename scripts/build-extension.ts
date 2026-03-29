/**
 * Post-build script: assembles the extension from vite build output.
 *
 * 1. Copies client assets to extension output
 * 2. Writes MV2 manifest with background script + alarms
 * 3. Strips PWA files (SW, web manifest)
 * 4. Extracts inline scripts for CSP compliance
 * 5. Bundles background.ts → background.js via Vite
 */

import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";

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

const ROOT = join(import.meta.dirname, "..");
const CLIENT_DIR = join(ROOT, ".output", "public");
const EXT_OUT = join(ROOT, ".output", "extension");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

// Clean and create output
rmSync(EXT_OUT, { recursive: true, force: true });
mkdirSync(EXT_OUT, { recursive: true });

// Copy client build output
cpSync(CLIENT_DIR, EXT_OUT, { recursive: true });

// Write extension manifest
writeFileSync(join(EXT_OUT, "manifest.json"), JSON.stringify(EXTENSION_MANIFEST, null, 2));

// Strip PWA files from extension output (SW only registers in browser context)
rmSync(join(EXT_OUT, "sw.js"), { force: true });
rmSync(join(EXT_OUT, "manifest.webmanifest"), { force: true });

// Extract inline scripts from index.html
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

// Build background script
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
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: "background.js",
      },
    },
  },
  logLevel: "warn",
});

console.log("Background script built");
console.log(`Extension built to ${EXT_OUT}`);
