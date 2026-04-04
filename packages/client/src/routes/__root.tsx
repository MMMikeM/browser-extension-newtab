import { Suspense, lazy, useEffect, useState } from "react";
import { ease, gradient } from "~/lib/gradients";
import { createRootRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { registerServiceWorker } from "~/lib/register-sw";
import { AddTaskInput } from "~/components/AddTaskInput";
import { UndoToast } from "~/components/UndoToast";

// Dynamic imports: both pull in auth-token → localStorage at module init, which crashes prerender
const SyncSettings = lazy(() => import("~/components/SyncSettings"));
const SyncHint = lazy(() => import("~/components/SyncHint"));

export const Route = createRootRoute({
  component: RootComponent,
});

// ─── Three mandatory layers ───────────────────────────────────────────────────
// Every option combines exactly these three. Vary intensity, not presence.

// 1. Floor — fades to warm dark, never cold black
const mkBottom = (startPct: number) =>
  gradient("linear").to("bottom")
    .from({ oklch: "transparent", position: startPct })
    .to({ oklch: "0.1 0.02 48", alpha: 0.8 })
    .ease(ease.in)
    .css();

const BOTTOM_SOFT = mkBottom(40);
const BOTTOM_MED = mkBottom(55);
const BOTTOM_HEAVY = mkBottom(70);

const createBloom = (x: number, y: number, alpha: number) => gradient("radial").shape(`ellipse ${x}% ${y}% at 50% 0%`)
  .from({ oklch: "0.28 0.055 62", alpha })
  .to({ oklch: "transparent" }).ease(ease.linear)
  .css();

// 2. Bloom — real amber light, not brightened white
const BLOOM_NARROW = createBloom(50, 100, 0.75)

const BLOOM_MED = createBloom(66, 66, 0.75)

const BLOOM_WIDE = createBloom(100, 50, 0.75)

const leftSide = (reach: number, alpha: number) => gradient("linear").from({ oklch: "0 0 0", alpha }).to({ oklch: "transparent", position: reach }).ease(ease.linear).stops()
const rightSide = (reach: number, alpha: number) => gradient("linear").from({ oklch: "transparent", position: 100 - reach }).to({ oklch: "0 0 0", alpha }).ease(ease.linear).stops()

// 3. Sides — pure black vignette, vary reach
const mkSides = (reach: number, alpha: number) => `linear-gradient(to right, ${leftSide(reach, alpha)}, ${rightSide(reach, alpha)})`;

const SIDES_TIGHT = mkSides(20, 0.25);
const SIDES_MED = mkSides(25, 0.25);
const SIDES_WIDE = mkSides(35, 0.25);

const BOTTOMS = [BOTTOM_SOFT, BOTTOM_MED, BOTTOM_HEAVY];
const BOTTOM_LABELS = ["floor: high", "floor: mid", "floor: low"];

const BLOOMS = [BLOOM_NARROW, BLOOM_MED, BLOOM_WIDE];
const BLOOM_LABELS = ["bloom: narrow", "bloom: med", "bloom: wide"];

const SIDES_LIST = [SIDES_TIGHT, SIDES_MED, SIDES_WIDE];
const SIDES_LABELS = ["sides: tight", "sides: med", "sides: wide"];

function RootComponent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bottomIdx, setBottomIdx] = useState(1);
  const [bloomIdx, setBloomIdx] = useState(1);
  const [sidesIdx, setSidesIdx] = useState(1);

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
  }, []);

  const handleAddTask = async (title: string) => {
    const [{ addTask }, { getActiveCategoryId }] = await Promise.all([
      import("~/lib/add-task"),
      import("~/lib/active-category"),
    ]);
    addTask(title, getActiveCategoryId());
  };

  const { location } = useRouterState();
  const isAuthRoute = location.pathname === "/auth";

  if (isAuthRoute) {
    return (
      <>
        <Outlet />
        {mounted && <UndoToast />}
      </>
    );
  }


  return (
    <>

      <div
        className="mx-auto min-h-screen max-w-lg px-6 pt-12 pb-8 relative z-1"
        style={{ backgroundColor: "oklch(0.20 0.01 50 / 75%)" }}
      >
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl tracking-[0.28em] text-foreground uppercase">Jot</h1>
          {mounted && (
            <Suspense fallback={<span className="text-muted-foreground">&#x2699;</span>}>
              <SyncSettings />
            </Suspense>
          )}
        </div>
        <AddTaskInput onAdd={handleAddTask} />
        {mounted && (
          <Suspense fallback={null}>
            <SyncHint onSignIn={() => router.navigate({ to: "/auth" })} />
          </Suspense>
        )}
        <div className="mt-3 flex flex-col gap-4" suppressHydrationWarning>
          <Outlet />
        </div>
        {mounted && <UndoToast />}
      </div>
      <div className="pointer-events-none fixed inset-0 noise z-0" />
      {/* Layer 1: bloom — radial spotlight from top */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: -2, backgroundImage: BLOOMS[bloomIdx] }} />
      {/* Layer 2: floor — linear darkening toward bottom */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: -3, backgroundImage: BOTTOMS[bottomIdx] }} />
      {/* Layer 3: sides — vignette left + right */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: -4, backgroundImage: SIDES_LIST[sidesIdx] }} />
      {/* Layer 4: base — background colour */}
      <div className="pointer-events-none fixed inset-0" style={{ zIndex: -5, backgroundColor: "oklch(0.205 0.015 50 / 80%)" }} />
      {/* Layer controls */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2">
        {([
          { labels: BOTTOM_LABELS, idx: bottomIdx, set: setBottomIdx },
          { labels: BLOOM_LABELS, idx: bloomIdx, set: setBloomIdx },
          { labels: SIDES_LABELS, idx: sidesIdx, set: setSidesIdx },
        ] as const).map(({ labels, idx, set }) => (
          <button
            key={labels[0]}
            onClick={() => set((i) => (i + 1) % labels.length)}
            className="rounded-full bg-popover/80 px-3 py-1 text-xs text-hint backdrop-blur-sm transition-colors hover:text-foreground"
          >
            {labels[idx]}
          </button>
        ))}
      </div>
    </>
  );
}
