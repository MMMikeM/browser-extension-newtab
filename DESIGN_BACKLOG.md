# Design Backlog

Items deferred from critique session. Enough context to action in a new session without re-running critique.

---

## ✅ C — Auth button breaks aesthetic contract `/polish`

**Problem:** The auth page submit button uses `bg-primary` (`oklch(0.60 0.18 118)`) as a full-width filled pill. It's the loudest element in the entire app — visually shouts in a design that otherwise whispers. The whole app is calm dark warmth, then the most important interactive moment screams in a completely different tonal register.

**File:** `packages/client/src/routes/auth.lazy.tsx` — the `<Button type="submit">` at line ~155.

**Fix:** Switch to a ghost or outlined button style. The action can still be primary without filling with the accent colour. Consider `variant="outline"` or a custom low-contrast fill like `bg-muted text-foreground hover:bg-muted/80`. The button should feel like a natural continuation of the form, not a call-to-action poster.

**Constraint:** Don't change button.tsx globally — scope to the auth page only if needed.

---

## ✅ D — Content feels "floaty / lost" `/arrange`

**Problem (user's words):** "Things still feel a little floaty/lost." The content column drifts on a void — no visual surface to rest on.

**Root cause:** The background is a lit-from-above radial bloom with bottom darkening. The content has no relationship to any viewport edge. It's compositionally weightless.

**What's been tried:**

- Bottom darkening linear gradient (`transparent 45% → oklch(0.11 0.01 50 / 65%) 100%`) — helps but doesn't fully solve it
- 1px separator line between category tabs and task list — adds structure but not ground
- Increased `--popover` lightness for contrast — unrelated but shows depth works

**Fix directions to explore (pick one):**

1. **Left accent rule** — a `border-l-2 border-primary/20` or `border-l border-hint` on the content column gives it a spine to hang from
2. **Subtle content wash** — `bg-card/15` or `bg-card/20` behind the task list area (not a card, just a wash) creates a surface
3. **Stronger bottom weight** — push the bottom gradient darker and further up (`transparent 30%` → dark `80%`) so content sits on something
4. **Compositional shift** — left-align "JOT" more aggressively (reduce `max-w-lg` centering), creating deliberate asymmetry that reads as designed rather than adrift

**Files:** `packages/client/src/routes/__root.tsx` (layout), `packages/client/src/app.css` (gradients).

---

## Completed this session (for reference)

- ✅ Sync button: tiny dot → `● Sync / Syncing… / Offline` pill with hover state
- ✅ Sync panel: in-flow → absolute positioned dropdown (no layout shift)
- ✅ Category colours: cool-toned generic palette → warm earthy palette
- ✅ Add category button: `+` text → dashed border `<Plus>` icon
- ✅ Background: SVG noise via `body::before` with `mix-blend-mode: soft-light`, 300px tile, `baseFrequency 0.9`, intermediate gradient stops, `in oklch` interpolation
- ✅ JOT wordmark: body-sized `text-hint` → DM Serif Display `text-2xl text-foreground`
- ✅ Opacity overuse: replaced throughout with `--hint` / `--ghost` solid tokens
- ✅ Auth discoverability: gear icon → "Sign in" text link
- ✅ UndoToast progress bar: `width` animation → `scaleX` transform
- ✅ Auth JOT heading: now matches main page (`font-display text-2xl tracking-[0.28em]`)
- ✅ console.logs removed from TaskListView and handleDragEnd
