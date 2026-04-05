/**
 * Extension assembler — runs after the main build (pnpm build).
 *
 * Compiles background.ts, copies PWA assets, applies extension-specific
 * transforms (inline script extraction, manifest generation), and removes
 * PWA-only files.
 *
 * Usage: node build-extension.ts
 */
import { build, loadEnv } from "vite";
import { readFileSync, writeFileSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname);
const CLIENT_DIST = join(ROOT, "dist");
const EXT_OUT = join(ROOT, "dist-extension");

const buildManifest = (serverUrl: string) => ({
  manifest_version: 2,
  name: "New Tab Todo",
  version: "1.0.0",
  browser_specific_settings: { gecko: { id: "newtab-todo@local" } },
  chrome_url_overrides: { newtab: "index.html" },
  content_security_policy: `script-src 'self' 'unsafe-eval'; object-src 'self'; connect-src 'self' https: ${serverUrl.startsWith("http:") ? serverUrl : ""}`.trim(),
  permissions: ["storage"],
  background: { scripts: ["background.js"], persistent: true },
});

const patchHtml = () => {
  let html = readFileSync(join(EXT_OUT, "index.html"), "utf-8");
  let scriptCount = 0;

  // Extract inline <script> blocks — MV2 CSP blocks inline scripts.
  html = html.replace(/<script([^>]*)>([\s\S]+?)<\/script>/g, (match, attrs: string, content: string) => {
    if (attrs.includes("src=") || !content.trim()) return match;
    const filename = `_inline-${scriptCount++}.js`;
    writeFileSync(join(EXT_OUT, filename), content);
    const typeAttr = attrs.match(/type="([^"]*)"/) ? ` type="${attrs.match(/type="([^"]*)"/)![1]}"` : "";
    const asyncAttr = attrs.includes("async") ? " async" : "";
    return `<script${typeAttr}${asyncAttr} src="/${filename}"></script>`;
  });

  // Convert async CSS preloads to plain stylesheets — MV2 CSP blocks the
  // inline onload="this.rel='stylesheet'" event handler (script-src-attr),
  // and all assets are local in the extension anyway so blocking load is fine.
  html = html.replace(
    /<link rel="preload" href="([^"]+)" as="style" onload="[^"]*"><noscript>.*?<\/noscript>/g,
    (_, href) => `<link rel="stylesheet" href="${href}">`,
  );

  writeFileSync(join(EXT_OUT, "index.html"), html);
  console.log(`  Extracted ${scriptCount} inline script(s), converted CSS preloads`);
};

// Firefox extension Web Workers can't fetch moz-extension:// resources, even
// with credentials: "same-origin". Patch the OPFS worker to set wasmBinary
// directly so Emscripten never calls fetch() for the WASM file.
const inlineWasm = () => {
  const wasmPath = join(EXT_OUT, "assets", "wa-sqlite.wasm");
  const wasmBase64 = readFileSync(wasmPath).toString("base64");
  const wasmBytes = `Uint8Array.from(atob("${wasmBase64}"),c=>c.charCodeAt(0)).buffer`;

  for (const f of readdirSync(join(EXT_OUT, "assets"))) {
    if (!f.startsWith("opfs-worker-") || !f.endsWith(".js")) continue;
    const path = join(EXT_OUT, "assets", f);
    const src = readFileSync(path, "utf-8");
    const patched = src.replace("var wasmBinary;", `var wasmBinary = ${wasmBytes};`);
    if (patched === src) throw new Error(`Failed to patch wasmBinary in ${f}`);
    writeFileSync(path, patched);
    console.log(`  Inlined WASM in ${f} (${(wasmBase64.length / 1024).toFixed(0)} KB base64)`);
  }
};

const env = loadEnv("production", ROOT, "");
const serverUrl = env.SERVER_URL || "http://localhost:3000";
console.log(`[build:ext] SERVER_URL: ${serverUrl}`);

// 1. Clean output and copy PWA assets
rmSync(EXT_OUT, { recursive: true, force: true });
cpSync(CLIENT_DIST, EXT_OUT, { recursive: true });
console.log(`  Copied dist/ → dist-extension/`);

// 2. Strip PWA-only files
rmSync(join(EXT_OUT, "sw.js"), { force: true });
rmSync(join(EXT_OUT, "manifest.webmanifest"), { force: true });

// 3. Compile background.ts directly into dist-extension/
//    emptyOutDir: false so the PWA assets we just copied are preserved.
//    publicDir: false so Vite doesn't re-copy public/ (e.g. manifest.webmanifest).
await build({
  configFile: false,
  publicDir: false,
  resolve: { alias: { "~": join(ROOT, "src") } },
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
    emptyOutDir: false,
    minify: false,
  },
  logLevel: "warn",
});
console.log(`  Built background.ts → background.js`);

// 4. Patch index.html for MV2 CSP compliance
patchHtml();

// 5. Inline WASM in the OPFS worker
inlineWasm();

// 6. Write extension manifest
const manifest = buildManifest(serverUrl);
writeFileSync(join(EXT_OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`  CSP: ${manifest.content_security_policy}`);
console.log(`[build:ext] Done → ${EXT_OUT}`);
