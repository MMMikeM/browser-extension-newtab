---
name: Ajot
description: A calm, fast task list for daily capture
colors:
  background: "oklch(0.165 0.02 262)"
  surface: "oklch(0.205 0.014 262)"
  surface-muted: "oklch(0.245 0.013 262)"
  surface-raised: "oklch(0.27 0.017 262)"
  foreground: "oklch(0.95 0.012 90)"
  muted-foreground: "oklch(0.75 0.02 255)"
  hint: "oklch(0.71 0.016 255)"
  ghost: "oklch(0.38 0.014 262)"
  border: "oklch(1 0 0 / 13%)"
  shell: "oklch(0.215 0.018 262 / 88%)"
  sidebar: "oklch(0.19 0.018 262 / 88%)"
  primary: "oklch(0.62 0.16 135)"
  primary-foreground: "oklch(0.97 0.03 105)"
  primary-subtle: "oklch(0.22 0.035 140)"
  primary-selected: "oklch(0.24 0.045 138)"
  date: "oklch(0.8 0.06 75)"
  destructive: "oklch(0.704 0.191 22.216)"
  destructive-subtle: "oklch(0.22 0.04 22)"
  pending: "oklch(0.7 0.1 75)"
  collab: "oklch(0.46 0.06 228)"
  collab-foreground: "oklch(0.9 0.01 80)"
  inbox: "oklch(0.90 0.008 80)"
  category-rust: "oklch(0.58 0.17 25)"
  category-amber: "oklch(0.68 0.16 58)"
  category-gold: "oklch(0.74 0.13 85)"
  category-sage: "oklch(0.60 0.12 138)"
  category-spruce: "oklch(0.53 0.10 162)"
  category-slate: "oklch(0.55 0.07 228)"
  category-mauve: "oklch(0.55 0.13 315)"
  category-blush: "oklch(0.61 0.13 4)"
typography:
  wordmark:
    fontFamily: "DM Serif Display, serif"
    fontSize: "1.125rem"
    letterSpacing: "0.28em"
  headline:
    fontFamily: "DM Serif Display, serif"
    fontSize: "1.75rem"
    lineHeight: 1.25
  capture:
    fontFamily: "Figtree Variable, Inter Variable, sans-serif"
    fontSize: "1.125rem"
  title:
    fontFamily: "Figtree Variable, Inter Variable, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Figtree Variable, Inter Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: "Figtree Variable, Inter Variable, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.43
  label:
    fontFamily: "Figtree Variable, Inter Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.025em"
rounded:
  sm: "0.27rem"
  md: "0.36rem"
  lg: "0.45rem"
  xl: "0.63rem"
  pill: "1.17rem"
  full: "9999px"
spacing:
  gutter: "1.5rem"
  gutter-touch: "1.25rem"
  row-y: "0.625rem"
  row-x: "0.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.pill}"
    height: "2.25rem"
  button-subtle:
    textColor: "{colors.hint}"
    rounded: "{rounded.pill}"
  toggle-pill-selected:
    backgroundColor: "{colors.primary-selected}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
  toggle-pill:
    textColor: "{colors.hint}"
    rounded: "{rounded.full}"
  task-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.5rem"
  sheet:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  sheet-row-active:
    backgroundColor: "{colors.primary-selected}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.hint}"
    rounded: "{rounded.lg}"
  add-button:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: "2rem"
---

# Design System: Ajot

## Overview

**Creative North Star: "The Quiet Instrument"**

Ajot is a notepad left on a clean desk late at night. It is dark, calm and low-stimulus: blue-black ink under paper-white text, built to be glanced at dozens of times a day on the new-tab page and read at leisure on the couch. The task list is the interface; everything else fades until it is needed.

Hierarchy comes from spacing and weight, not colour or decoration. The only real colour is a leaf-green primary, used sparingly. Depth comes from tonal layering on a textured, gradient-lit background rather than from cards and shadows. Content must feel anchored to a surface, not adrift on the gradient: on desktop that surface is a single inset sheet, the notepad on the desk.

**Key Characteristics:**

- Dark mode only: cool, low-chroma ink surfaces, with the warmth kept in the text and accents.
- A serif wordmark and list titles (DM Serif Display) over a quiet sans body (Figtree).
- Solid secondary tokens (`hint`, `ghost`) instead of opacity-washed text.
- Underline inputs, pill buttons, no boxed cards.
- Touch and pointer each get their own layout, with full feature parity.

## Colors

A near-monochrome ink palette: blue-black surfaces, slate secondary text and warm paper-white primary text, with a single leaf green. Surfaces are cool and very low in chroma; warmth lives only in the foreground, the date and the category swatches.

### Primary

- **Leaf Green** (`oklch(0.62 0.16 135)`): a checkbox being ticked (a solid fill during the 450ms hold), links, the toast countdown and selected states. The only saturated colour in the chrome. Hue 135 keeps it from turning chartreuse against the blue surfaces; lightness 0.62 keeps the checkmark (`primary-foreground`) at 3:1 while green text stays above 4.5:1 on `shell`, `primary-subtle` and `primary-selected`. Done checkboxes recede to a `primary` check on `primary-subtle` with a `primary/35` edge (4.98:1 for the check), in the list and the detail sheet alike, so finished work doesn't outshine open tasks.
- **Primary Subtle / Selected** (`oklch(0.22 0.035 140)` / `oklch(0.24 0.045 138)`): dark green surfaces for the touch add button, selected toggle pills and the active row in the category sheet.

### Neutral

- **Background** (`oklch(0.165 0.02 262)`): the page (the desk), under the texture and gradients. The same value is inlined on `<html>` in `index.html` for the first paint; `theme-color`, the manifest and the icons use `#151a22`.
- **Shell** (`oklch(0.215 0.018 262 / 88%)`): the surface of the column, a step lighter than the desk so the panel reads as an object on it.
- **Sidebar** (`oklch(0.19 0.018 262 / 88%)`): the desktop sidebar, recessed a step below `shell` so the list stays the lighter, leading page.
- **Surface / Surface Muted / Surface Raised** (`oklch(0.205 …)` / `oklch(0.245 …)` / `oklch(0.27 …)`): rows, swipe trays and hover wells, then sheets and popovers. Each step up is lighter.
- **Foreground** (`oklch(0.95 0.012 90)`): task titles and primary text, a warm paper white.
- **Hint** (`oklch(0.71 0.016 255)`): secondary labels, counts and subtle buttons. The dimmest token allowed for readable text.
- **Ghost** (`oklch(0.38 0.014 262)`): decorative, non-text affordances only, such as underline borders, dividers and the hover grip.

### Accents with a job

- **Date** (`oklch(0.8 0.06 75)`): due-date labels, a warm sand against the ink.
- **Destructive** (`oklch(0.704 0.191 22.216)`) on **Destructive Subtle** (`oklch(0.22 0.04 22)`): overdue dates, delete actions and errors.
- **Pending** (`oklch(0.7 0.1 75)`): syncing state.
- **Collab** (`oklch(0.46 0.06 228)`): owner faces on lists and tasks shared with you.
- **Category swatches** (Rust, Amber, Gold, Sage, Spruce, Slate, Mauve, Blush): warm-leaning, lower-chroma colours chosen to sit on the dark background. The Inbox uses a warm off-white (`oklch(0.90 0.008 80)`). A list without a colour shows a `ghost` dot everywhere (sidebar, sheet, list title, adding-to chip), never the Inbox white.

### Named Rules

**The Solid Token Rule.** Secondary text uses `hint` or `ghost`, never `text-foreground/50` or any opacity on a text colour.

**The Contrast Floor Rule.** Readable text meets 4.5:1 on every surface it sits on. `ghost` is never used for text, placeholders or functional icon buttons.

## Typography

**Display Font:** DM Serif Display (with serif fallback)
**Body Font:** Figtree Variable (with Inter Variable and sans-serif fallbacks)

**Character:** A literary serif for identity and orientation, paired with a soft geometric sans that stays out of the way.

### Hierarchy

- **Wordmark** (DM Serif Display, 1.125rem, uppercase, tracking 0.28em): "AJOT" in the header. Kept small so the list title leads.
- **Headline** (DM Serif Display, 1.75rem, 1.25): the active category as the list title, with its colour dot and open count, on both targets. Page titles (People, sign-in) use the same style.
- **Capture** (Figtree, 1.125rem): the "What needs doing?" input.
- **Title** (Figtree 600, 1.125rem, 1.375): the task title in the detail sheet.
- **Body** (Figtree 500, 1rem, 1.5): task titles in the list, wrapping to at most two lines.
- **Body Small** (Figtree, 0.875rem): subtasks, notes and sheet rows.
- **Label** (Figtree 500, 0.75rem, tracking 0.025em, uppercase): section toggles such as "Done (2)" and sheet headings.
- **Avatar initials** (Figtree 600, 11px, tight tracking) in a 22px circle; the 28px `md` size uses 12px. Nothing smaller.

## Layout

- **Desktop (fine pointer, at least 44rem wide; the `desk:` variant and `useIsDesk`):** the category sidebar (`--sidebar-w`, 13rem) and the list column (`--column-w`, 28rem, 1.5rem gutters) form one sheet centred on the page: the column on `shell`, the sidebar on the recessed `sidebar` tone behind a faint hairline. The sheet is inset `--sheet-inset` (2rem) from the top and bottom of the window, with `2xl` corners and one `shadow-sheet` cast by the column's `::after` under both halves, so it reads as a notepad on the desk rather than a stripe down the window. The panel geometry lives in those tokens and the derived `--column-shift` and `--panel-left`; the column, sidebar, task detail sheet and share sheet all read from them. AppShell draws the sidebar's surface so it is in the first paint; the sidebar's items arrive with the data. Top to bottom, the column holds the header, the list title, the capture input (autofocused) and the list. People keeps the sidebar (lists can't be reordered there), so moving between it and the list doesn't shift the column; sign-in and invite pages use a lone centred column. Narrower pointer windows fall back to the lone column. The task detail sheet docks inside the same geometry: aligned with the column, its bottom inset `--sheet-inset` from the window, with `2xl` corners on every side, so it reads as a page of the notepad rather than a drawer from the window edge.
- **Touch (coarse pointer):** a full-height (`100dvh`) column up to 32rem wide. From top to bottom: header (wordmark and sync status), the tappable list title, the scrolling list, and the input bar pinned to the bottom edge. The gutter is `max(1.25rem, safe-area insets)`, and the input bar pads for the home indicator (less while typing, when the keyboard covers it). The list's top and bottom edges fade only when rows have scrolled past them (`scroll-edge-fade`, a scroll-driven mask; no fade where scroll timelines are unsupported). Layout switches on pointer type (`touch:` variant), not viewport width.
- **Rhythm:** rows use 0.625rem vertical padding, with tight groups inside a row and larger gaps between sections.
- **Negative space:** the inset sheet, its shadow and the list title anchor the desktop layout; the space around the sheet is the desk (texture, bloom and vignettes), not unused column.

## Elevation & Depth

Flat at rest. Depth comes from tonal layering (background, then surface, surface-muted and surface-raised) over a textured backdrop: SVG fractal noise blended with `soft-light` to dither the gradients, a cool, moonlit radial bloom from the top, darkening towards the bottom, and soft side vignettes. Shadows appear only on floating layers: `shadow-sheet` (a white hairline ring plus a long, soft drop) under the desktop sheet, `shadow-md` on popovers and `shadow-lg` on toasts. Bottom sheets sit over a dim, lightly blurred backdrop (`oklch(0.06 0.012 262 / 40%)`).

## Shapes

- Base radius 0.45rem. Rows and toasts use `lg`; bottom sheets round their top corners with `xl`.
- Buttons are pills (`1.17rem`); toggle pills, avatars, colour dots and the touch add button are full circles or capsules.
- Checkboxes use a 6px radius.
- Inputs have no box: a single underline only.

## Components

### Buttons

- **Shape:** pill (`1.17rem`).
- **Variants:** primary (green fill), outline, ghost (muted well on hover), subtle (hint text that brightens on hover) and link. A destructive intent recolours ghost and subtle buttons.
- **Primary action with a text label** (Sign in, accept invite, add collaborator): the `primary-subtle` pill with `primary` text, as the touch add button uses. Light text on the solid `primary` fill measures about 3.2:1, under the Contrast Floor.
- **Touch:** targets grow to 36–44px through `touch:` sizing rather than separate components.

### Toggle Pills

- Unselected pills show hint text; selected pills show a dark green fill with primary text. Used for single-choice sets such as Assignee.

### Inputs

- **Style:** transparent, bottom border in `ghost`, placeholder in `hint`.
- **Focus:** the underline brightens to `hint`; there is no ring.
- **Size:** at least 16px on phones, so iOS doesn't zoom on focus.

### Task Row

- A checkbox pinned to the first title line, then the title (wraps to two lines), then the meta: due date (`date`, or `destructive` when overdue), whose task it is, and the assignee. As in the sidebar, a face means whose task it is: a task shared with you shows its owner's face on `collab`, while a task you shared shows a `hint` people glyph ("Shared with …" on hover and for screen readers), never a recipient's face. The assignee is a hollow face (`hint` initials in a `ghost` ring), so it doesn't read as the owner. Every chip carries an accessible name ("Sarah Murray's task", "Assigned to Sam Okafor"). Checkboxes align with the capture input's left edge and the meta with its right edge; the title takes all the width between.
- **Reordering:** there's no grip; the row itself is the handle. On touch a long press (250ms, before the finger moves) picks it up, so a tap still opens the task, a quick flick still scrolls, and the swipe tray stays shut while dragging. Rows don't select text or show the iOS callout during the hold. With a mouse the row picks up once it moves 5px, so a click still opens the task. Subtasks reorder only within their parent. Done rows, and subtasks under them, aren't sortable. A dragged row lifts onto `popover` with `shadow-md`, carrying its subtasks inside one lift. Keyboard reordering isn't offered yet.
- **Desktop quick actions:** hover or keyboard focus reveals Set due date (only when undated), Add subtask and Delete as `hint` icon buttons floating over the row's end. Nothing reserves space for them at rest: the title's tail fades out beneath them (`fade-under-actions`, sized by the row's `--actions-w`) and the meta slides left to clear them.
- **Touch quick actions:** swipe left to reveal a tray on `surface-muted` with Date and Subtask (not on done rows), plus Delete on `destructive-subtle`. The tray is as wide as its actions, each cell as wide as the widest label and at least 56px, and the row slides by exactly that width. When the task isn't yours to delete, the tray simply has no Delete; the owner's face in the row already says whose it is. The row is transparent at rest and turns opaque only while swiping (`data-swiping`), so rows never read as stacked cards. On a device's first visit, the top row slides open once to show the tray.
- **Completing:** a ticked row holds its checked, struck-through, faded state for 450ms before it moves to Done, so the tick is seen and a mis-click can be undone by ticking again in that window. Once in Done, its checkbox recedes. With the keyboard, focus moves to the next row's checkbox (else the previous one, else the capture input) before the row leaves; pointer focus stays put, so a tap never raises the on-screen keyboard.
- **Subtasks:** the thread drops from the centre of the parent checkbox, and subtask checkboxes align with the parent title. Done subtasks fold into a `hint` line at the end of the thread ("2 done") that opens the task; it is left out on done parents.
- **Done section:** a "Done (n)" label toggle that remembers being open or closed per device. While open, a subtle "Clear" at its right end deletes the done tasks you're allowed to delete, with Undo and no confirmation; others' done tasks in shared lists stay.
- **List rows elsewhere** (detail sheet, People, sharing): hover-revealed actions sit in a `RevealGroup`, which floats over the row's end on the row's hover colour on desktop and stays in flow on touch.

### Navigation

- **Wording:** the interface says "list" throughout ("Add list", "List options", "List deleted"); code identifiers keep "category".
- **Desktop:** the sidebar lists Inbox and the lists with colour dots. Inbox is always there, even when empty. Long names truncate, with the full name on hover. The active item shows a short coloured bar; items double as drop targets for dragged tasks. Open-task counts sit in a fixed-width right column, so they line up down the sidebar. Lists shared with you sit under a "Shared with me" label, each with its owner's avatar after the name (full name on hover). The per-category options button fades in over the count on hover or focus, so the row never reflows. "Add" lines up with the category names. Choosing a list from People returns to the list, and the People link shows as active there; it shows only when signed in. Below the `desk:` breakpoint a fine-pointer window switches to the touch pattern: the sidebar hides and the list title opens the category sheet.
- **Whose list:** a face on a list always means it is that person's list. Your own list that others can see shows a `hint` people glyph after its name instead ("Shared with …" on hover and for screen readers), never a collaborator's face.
- **List options:** Rename, Colour, Share and Delete or Leave share one item style with icons. The first swatch is "No colour", a `ghost` fill, the same dot an uncoloured list shows. The chosen swatch shows a ring and tick, and is marked `aria-pressed`, so selection doesn't rely on colour.
- **Touch:** the active list is the serif list title at the top (colour dot, name, open count) and a smaller "● List ⌄" chip above the input. Both open the same bottom sheet, headed "Lists", which lists them with open-task counts, marks the active row with `primary-selected`, and holds the add-list, per-list options and People (signed in only) entries. Long names wrap instead of truncating, with the colour dot on the first line. Lists shared with you sit under a "Shared with me" label, with the owner's name as a suffix.

### Search

- **Where:** the list screen gains nothing. Desktop: a quiet "Search" row at the top of the sidebar, with a `/` key hint; `/` opens it from anywhere except a field being typed in (the empty capture input doesn't count). Touch: a "Search all lists" field at the top of the lists sheet. Both open `/search`, where the serif list title becomes the search field and results fill the list's place.
- **Results:** every task on the device, done ones, subtasks, descriptions and notes, matched with Ekrina. Open tasks group under their list's dot and name in the sidebar's order; done ones follow in one quieter "Done" group with their list and completion date. A match is a quiet `secondary` wash, not colour. A match in a description or note shows that line; a subtask shows the task it sits under. A typo shows "Showing results for …".
- **Add:** when no task has exactly that title, an outline pill adds it to the list search was opened from; with nothing found it's the `primary-subtle` pill under "Nothing matches.", in the Empty List voice.
- **Opening one** sheets it over the results, and closing lands back on them with the query kept.

### Empty List

- A time-of-day phrase ("Morning.", "All clear.", "Evening.", "All quiet.") in DM Serif Display at 1.5rem in `muted-foreground`, with a `hint` line pointing at the capture input (above on desktop, below on touch).
- When every task in a list is done, the list shows "All done." in the same style, over a `hint` time-of-day line ("Nothing left for tonight.", "Rest well."). It centres above the input bar on touch and sits under the input on desktop. It settles in (opacity and a 6px rise, 700ms) only when the list has just been cleared, never on load, and appears without motion under reduced motion.

### Task Detail Sheet

- Shows only what the task has: the title and checkbox, then the description, date, list, sharing and assignee rows, subtasks and notes. Icons hang in a gutter under the checkbox, so values start at the title's left edge. Anything missing is offered by one `+ Add` control that opens a row of chips (Date, Description, Subtask, Note, List, Share, Assignee); a field added this way stays until the sheet closes. The footer holds Add and Delete.
- Ticking, deleting the task, and deleting a subtask or note all offer Undo, as in the list.
- Someone a task was shared with sees the owner's name ("Sarah Murray’s task"), never assignee pills, and is never listed under "Shared with".

### Toasts

- Surface card, bottom centre, with a countdown bar (`primary` at 40%, so it reads against the card) animated with `scaleX`. The bar follows the toast's own timeout, pauses while the stack is hovered or focused, and is absent for toasts without a timeout and under reduced motion. Dismiss is an icon button. On desktop they sit inside the sheet, centred on the list column; on touch they sit above the input bar (`--input-bar-h`). While a sheet is open they move above it, to the top of the screen (or of the desktop sheet's inset), on a layer above the sheet so Undo can be pressed without dismissing it.

### Sync Status

- A dot plus a text label (Sync, Syncing…, Offline · saved here) in the header, opening the account menu. The dot is `primary` when connected and `pending` (pulsing) while connecting or while changes are in flight. Offline is a hollow `hint` ring that doesn't pulse: nothing is lost, so it never reads as an error. Sync reads offline when the device goes offline, or when a reconnect fails twice in a row; a single dropped connection reads as Syncing… while it retries. While offline, the account menu explains that changes stay on this device and sync once it's back online.

## Do's and Don'ts

### Do:

- **Do** keep the task list the loudest thing on screen; chrome fades until it is needed.
- **Do** use `hint` for secondary text and `ghost` only for non-text affordances.
- **Do** make anything revealed by `group-hover` reachable on touch: visible under `touch:`, or through the swipe tray.
- **Do** float overlays on touch above the input bar using `--input-bar-h`, not at `bottom-4`.
- **Do** animate progress with `scaleX` transforms, never `width`.
- **Do** use absolutely positioned overlays for panels that open inline.

### Don't:

- **Don't** use opacity to vary text colour (`text-foreground/50`).
- **Don't** show sync status as a tiny icon-only dot; it needs a label and a touch target.
- **Don't** let inline panels push the layout around.
- **Don't** reserve layout space for controls that are invisible at rest; float them over the content they cover.
- **Don't** force `text-sm` on phone inputs; keep the primitive's `text-base md:text-sm`.
- **Don't** pick category swatches from generic palettes; they must be warm-toned and sit well on the background.
- **Don't** tint the surfaces warm. Brown neutrals made the whole app read as murky; warmth belongs in the text, the date and the swatches.
- **Don't** use bright accents that jar at 2am, boxy cards, flat greys or default Tailwind styling.
