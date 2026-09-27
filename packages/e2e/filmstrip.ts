/**
 * Captures a visual filmstrip during page load using CDP screencast.
 * Chrome pushes frames as the renderer updates.
 * Captures until DOMContentLoaded + 1 extra frame, then deduplicates and
 * writes a filmstrip HTML viewer.
 *
 * Usage:
 *   npx tsx filmstrip.ts [path] [--cpu=<rate>] [--network=<preset>]
 *
 *   path              Route to load, default "/"
 *   --cpu=<rate>      CPU throttle multiplier (e.g. 4 = 4× slower), default 1
 *   --network=<name>  One of: fast3g | slow3g | 4g | none (default none)
 *
 * Examples:
 *   BASE_URL=https://extension-sync-service.fly.dev npx tsx filmstrip.ts /
 *   npx tsx filmstrip.ts /auth --cpu=4 --network=fast3g
 *
 * Output: .filmstrip/<slug>/frame-NNN.png  +  .filmstrip/<slug>/index.html
 */

import { chromium } from "@playwright/test";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.slice(2).split("=");
      return [k, v];
    }),
);

const PAGE_PATH = positional[0] ?? "/";
const CPU_RATE = parseFloat(flags["cpu"] ?? "1");

const NETWORK_PRESETS: Record<
  string,
  { latencyMs: number; downloadKbps: number; uploadKbps: number }
> = {
  "4g": { latencyMs: 20, downloadKbps: 4096, uploadKbps: 3072 },
  fast3g: { latencyMs: 562, downloadKbps: 1475, uploadKbps: 750 },
  slow3g: { latencyMs: 2000, downloadKbps: 500, uploadKbps: 500 },
};
const networkPreset =
  flags["network"] && flags["network"] !== "none" ? NETWORK_PRESETS[flags["network"]] : null;

if (flags["network"] && flags["network"] !== "none" && !networkPreset) {
  console.error(
    `Unknown network preset "${flags["network"]}". Choose: 4g | fast3g | slow3g | none`,
  );
  process.exit(1);
}

const slug = [
  PAGE_PATH.replace(/\//g, "_").replace(/^_/, "") || "root",
  CPU_RATE !== 1 ? `cpu${CPU_RATE}x` : "",
  flags["network"] && flags["network"] !== "none" ? flags["network"] : "",
]
  .filter(Boolean)
  .join("-");

const OUT_DIR = path.join(".filmstrip", slug);
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  colorScheme: "dark",
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Page.enable");

if (CPU_RATE !== 1) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_RATE });
}
if (networkPreset) {
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: networkPreset.latencyMs,
    downloadThroughput: (networkPreset.downloadKbps * 1024) / 8,
    uploadThroughput: (networkPreset.uploadKbps * 1024) / 8,
  });
}

type RawFrame = { t: number; buf: Buffer };
const rawFrames: RawFrame[] = [];

let navStart = 0;
let dclAt: number | null = null;
let stopped = false;

// Resolves once DCL has fired and one more frame has arrived.
let resolveDone!: () => void;
const doneCapturing = new Promise<void>((r) => {
  resolveDone = r;
});

const stopScreencast = () => {
  if (!stopped) {
    stopped = true;
    cdp.send("Page.stopScreencast").catch(() => {});
    resolveDone();
  }
};

// Fire ack immediately (fire-and-forget) so Chrome doesn't wait before
// sending the next frame — this is the key to high frame throughput.
cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
  const buf = Buffer.from(data, "base64");
  rawFrames.push({ t: Date.now() - navStart, buf });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});

  if (dclAt !== null) {
    stopScreencast();
  }
});

cdp.on("Page.domContentEventFired", () => {
  if (dclAt === null) {
    dclAt = Date.now() - navStart;
    // Don't stop here — let one more frame arrive (see handler above)
  }
});

const label = [
  `cpu=${CPU_RATE}x`,
  flags["network"] ? `network=${flags["network"]}` : "network=none",
].join("  ");

console.log(`Navigating to ${BASE_URL}${PAGE_PATH}  [${label}] …`);
navStart = Date.now();

await cdp.send("Page.startScreencast", {
  format: "png", // lossless → byte-identical frames dedup reliably
  quality: 100,
  maxWidth: 1280,
  maxHeight: 900,
  everyNthFrame: 1,
});

// Not waitUntil 'load': the app's SSE connection stays open, so 'load' never fires.
await Promise.race([
  page.goto(`${BASE_URL}${PAGE_PATH}`, { waitUntil: "domcontentloaded" }),
  doneCapturing,
]);

// If DCL fired via goto but no extra frame arrived yet, wait briefly for it
if (!stopped) {
  await Promise.race([doneCapturing, new Promise((r) => setTimeout(r, 500))]);
  stopScreencast();
}

if (dclAt === null) {
  dclAt = await page.evaluate(() => {
    const [e] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return e ? Math.round(e.domContentLoadedEventEnd) : null;
  });
}

const totalMs = Date.now() - navStart;
await browser.close();

const hash = (buf: Buffer) => crypto.createHash("md5").update(buf).digest("hex");

const deduped: RawFrame[] = [];
let lastHash = "";
let dupCount = 0;
for (const frame of rawFrames) {
  const h = hash(frame.buf);
  if (h !== lastHash) {
    deduped.push(frame);
    lastHash = h;
  } else {
    dupCount++;
  }
}

console.log(
  `Captured ${rawFrames.length} frames (${dupCount} duplicates removed → ${deduped.length} unique)  DCL=${dclAt} ms  total=${totalMs} ms`,
);

for (const f of fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))) {
  fs.rmSync(path.join(OUT_DIR, f));
}

const saved: { t: number; file: string }[] = [];
for (let i = 0; i < deduped.length; i++) {
  const file = `frame-${String(i).padStart(4, "0")}.jpg`;
  fs.writeFileSync(path.join(OUT_DIR, file), deduped[i].buf);
  saved.push({ t: deduped[i].t, file });
}

console.log(`Frames saved to ${OUT_DIR}/`);

const frameItems = saved
  .map(({ t, file }, i) => {
    const isDcl = dclAt !== null && t >= dclAt && (i === 0 || deduped[i - 1].t < dclAt);
    return `<div class="frame${isDcl ? " dcl-frame" : ""}">
        <img src="${file}" loading="lazy">
        <span class="label">${t} ms${isDcl ? " ← DCL" : ""}</span>
      </div>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Filmstrip — ${PAGE_PATH} (DCL ${dclAt} ms)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #111; color: #eee; font: 13px/1.4 system-ui; padding: 16px; }
  h1 { margin-bottom: 4px; font-size: 15px; }
  .meta { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .chip { background: #222; border: 1px solid #333; border-radius: 4px; padding: 3px 8px; font-size: 11px; }
  .strip { display: flex; flex-wrap: wrap; gap: 8px; }
  .frame { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .frame img { width: 256px; border: 1px solid #333; border-radius: 4px; }
  .frame.dcl-frame img { border-color: #f90; }
  .label { font-size: 11px; color: #aaa; }
  .dcl-frame .label { color: #f90; }
</style>
</head>
<body>
<h1>Filmstrip: <code>${PAGE_PATH}</code></h1>
<div class="meta">
  <span class="chip">DCL: ${dclAt} ms</span>
  <span class="chip">Frames: ${deduped.length} unique / ${rawFrames.length} total</span>
  <span class="chip">CPU: ${CPU_RATE}×</span>
  <span class="chip">Network: ${flags["network"] ?? "none"}</span>
  <span class="chip">URL: ${BASE_URL}</span>
</div>
<div class="strip">
${frameItems}
</div>
</body>
</html>`;

const htmlPath = path.join(OUT_DIR, "index.html");
fs.writeFileSync(htmlPath, html, "utf8");
console.log(`Viewer:  ${htmlPath}`);
