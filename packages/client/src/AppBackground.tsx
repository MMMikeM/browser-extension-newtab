import type { ReactNode } from "react";
import { gradient, ease } from "./lib/gradients";
import { useNavContext } from "~/lib/state/nav-context";

const mkBottom = (startPct: number) =>
  gradient("linear")
    .to("bottom")
    .from({ oklch: "transparent", position: startPct })
    .to({ oklch: "0.1 0.02 48", alpha: 0.8 })
    .ease(ease.in)
    .css();

const createBloom = (x: number, y: number, alpha: number) =>
  gradient("radial")
    .shape(`ellipse ${x}% ${y}% at 50% 0%`)
    .from({ oklch: "0.28 0.055 62", alpha })
    .to({ oklch: "transparent" })
    .ease(ease.linear)
    .css();

const leftSide = (reach: number, alpha: number) =>
  gradient("linear")
    .from({ oklch: "0 0 0", alpha })
    .to({ oklch: "transparent", position: reach })
    .ease(ease.linear)
    .stops();
const rightSide = (reach: number, alpha: number) =>
  gradient("linear")
    .from({ oklch: "transparent", position: 100 - reach })
    .to({ oklch: "0 0 0", alpha })
    .ease(ease.linear)
    .stops();
const mkSides = (reach: number, alpha: number) =>
  `linear-gradient(to right, ${leftSide(reach, alpha)}, ${rightSide(reach, alpha)})`;

const FLOOR = mkBottom(40);
const BLOOM = createBloom(50, 100, 0.75);
const SIDES = mkSides(20, 0.25);

export function AppBackground() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 noise z-0" />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -2, backgroundImage: BLOOM }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -3, backgroundImage: FLOOR }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -4, backgroundImage: SIDES }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -5, backgroundColor: "oklch(0.205 0.015 50 / 80%)" }}
      />
    </>
  );
}

export function AppShell({ right, children }: { right?: ReactNode; children?: ReactNode }) {
  const { mobileNavContent } = useNavContext();
  return (
    <div
      className="mx-auto min-h-screen max-w-sm px-6 pt-8 pb-8 relative z-1
                 touch:flex touch:flex-col touch:h-dvh touch:min-h-0 touch:pb-0
                 touch:pt-[max(2rem,env(safe-area-inset-top,0px))]"
      style={{ backgroundColor: "oklch(0.20 0.01 50 / 75%)" }}
    >
      <div className="mb-5 flex items-center justify-between shrink-0">
        <h1 className="font-display text-2xl tracking-[0.28em] text-foreground uppercase">Ajot</h1>
        {mobileNavContent && (
          <div className="hidden touch:flex flex-1 justify-center">{mobileNavContent}</div>
        )}
        {right}
      </div>
      {children}
    </div>
  );
}

export function PendingShell() {
  return <AppShell right={<span className="text-muted-foreground opacity-40">&#x2699;</span>} />;
}
