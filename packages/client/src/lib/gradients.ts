export const ease = {
  linear: (t: number) => t,
  in: (t: number) => t ** 3,
  out: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
};

type GradientType = "linear" | "radial";
type Direction = "left" | "right" | "top" | "bottom";

type Stop = {
  oklch: string | "transparent"; // L C H values, e.g. "0.07 0.018 48", or "transparent"
  alpha?: number;                 // 0–1, default 1; forced to 0 when oklch is "transparent"
  position?: number;              // 0–100; defaults to 0 in from(), 100 in to()
};

const lerpOklch = (a: string, b: string, t: number): string =>
  a.split(" ")
    .map((n, i) => Number((+n + (+b.split(" ")[i]! - +n) * t).toFixed(4)))
    .join(" ");

const fmtStop = (oklch: string, alpha: number, pct: number): string => {
  const a = Math.max(0, Math.min(1, alpha));
  const color =
    a <= 0 ? "transparent"
    : a >= 1 ? `oklch(${oklch})`
    : `oklch(${oklch} / ${Number(a.toFixed(3))})`;
  return `${color} ${Number(pct.toFixed(1))}%`;
};

type ResolvedStop = Stop & { position: number };

class GradientBuilder {
  private _type: GradientType;
  private _direction = "";
  private _shape = "";
  private _stops: ResolvedStop[] = [];
  private _easing: (t: number) => number = ease.inOut;
  private _steps = 8;

  constructor(type: GradientType) {
    this._type = type;
  }

  from(stop: Stop): this {
    this._stops = [{ position: 0, ...stop }];
    return this;
  }

  /** Add an intermediate stop — easing is applied independently per segment */
  stop(stop: Stop & { position: number }): this {
    this._stops.push(stop);
    return this;
  }

  /** Direction (linear only) OR destination color stop — overloaded */
  to(arg: Direction | Stop): this {
    if (typeof arg === "string") {
      this._direction = `to ${arg}`;
    } else {
      this._stops.push({ position: 100, ...arg });
    }
    return this;
  }

  /** Radial shape/size/position, e.g. "ellipse 80% 70% at 50% 0%" */
  shape(s: string): this {
    this._shape = s;
    return this;
  }

  ease(fn: (t: number) => number): this {
    this._easing = fn;
    return this;
  }

  steps(n: number): this {
    this._steps = n;
    return this;
  }

  /** Raw comma-separated stops — use when composing multiple segments (e.g. SIDES) */
  stops(): string {
    return this._buildStops().join(", ");
  }

  css(): string {
    const stopsStr = this.stops();
    if (this._type === "linear") {
      // "in oklch" and "to <direction>" are one space-separated argument before the first comma
      const prefix = ["in oklch", this._direction].filter(Boolean).join(" ");
      return `linear-gradient(${[prefix, stopsStr].join(", ")})`;
    }
    const prefix = ["in oklch", this._shape].filter(Boolean).join(" ");
    return `radial-gradient(${[prefix, stopsStr].join(", ")})`;
  }

  toString(): string {
    return this.css();
  }

  private _buildStops(): string[] {
    if (this._stops.length < 2) throw new Error("gradient() requires at least .from() and .to(stop)");

    for (let i = 1; i < this._stops.length; i++) {
      if (this._stops[i]!.position < this._stops[i - 1]!.position) {
        throw new Error(
          `gradient() stop positions must be non-decreasing: stop[${i - 1}]=${this._stops[i - 1]!.position} > stop[${i}]=${this._stops[i]!.position}`,
        );
      }
    }

    const result: string[] = [];

    for (let i = 0; i < this._stops.length - 1; i++) {
      const a = this._stops[i]!;
      const b = this._stops[i + 1]!;

      // "transparent" borrows the adjacent stop's oklch so the lerp stays in-gamut
      const aColor = a.oklch === "transparent" ? b.oklch as string : a.oklch;
      const bColor = b.oklch === "transparent" ? a.oklch as string : b.oklch;
      const fa = a.oklch === "transparent" ? 0 : (a.alpha ?? 1);
      const ta = b.oklch === "transparent" ? 0 : (b.alpha ?? 1);

      const segment = Array.from({ length: this._steps + 1 }, (_, j) => {
        const t = j / this._steps;
        const et = this._easing(t);
        return fmtStop(
          lerpOklch(aColor, bColor, et),
          fa + (ta - fa) * et,
          a.position + (b.position - a.position) * t,
        );
      });

      // Skip the first stop of subsequent segments — it's the last stop of the previous
      result.push(...(i === 0 ? segment : segment.slice(1)));
    }

    return result;
  }
}

export const gradient = (type: GradientType): GradientBuilder => new GradientBuilder(type);
