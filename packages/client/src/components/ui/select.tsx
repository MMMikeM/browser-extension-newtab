import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { type ComponentProps } from "react";

import { cn } from "~/lib/utils";

// ---------------------------------------------------------------------------
// Root — pass-through, no styling needed
// ---------------------------------------------------------------------------

const Select = ({ ...props }: ComponentProps<typeof SelectPrimitive.Root>) => (
  <SelectPrimitive.Root data-slot="select" {...props} />
);

// ---------------------------------------------------------------------------
// Trigger — pill-style: subtle border, text-hint at rest, foreground on hover.
// The pill shape (vs an underline) signals "this opens a dropdown".
// ---------------------------------------------------------------------------

const SelectTrigger = ({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    data-slot="select-trigger"
    className={cn(
      // Shape
      "inline-flex items-center gap-1.5 rounded-full",
      // Sizing
      "px-3 py-1.5 text-sm",
      // Surface & colour
      "border border-border/50 bg-transparent text-hint",
      // Interaction
      "hover:border-border hover:text-foreground",
      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
      "aria-expanded:border-border aria-expanded:text-foreground",
      // Misc
      "outline-none transition-colors",
      "disabled:pointer-events-none disabled:opacity-50",
      "select-none whitespace-nowrap",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronDown
      className="size-3 shrink-0 opacity-60 transition-transform duration-150 group-aria-expanded:rotate-180"
      aria-hidden="true"
    />
  </SelectPrimitive.Trigger>
);

// ---------------------------------------------------------------------------
// Value — displays the selected item's text (or placeholder when empty)
// ---------------------------------------------------------------------------

const SelectValue = ({ ...props }: ComponentProps<typeof SelectPrimitive.Value>) => (
  <SelectPrimitive.Value data-slot="select-value" {...props} />
);

// ---------------------------------------------------------------------------
// Content — positioner + popup with list inside.
//
// No Portal wrapper: Base UI Drawer is modal=true by default, which marks
// everything outside the drawer's DOM subtree as `inert`. A portalled popup
// would land outside the drawer and be blocked. Rendering inline keeps the
// popup inside the drawer's accessible scope while Positioner's fixed
// positioning still floats it visually above all content.
// ---------------------------------------------------------------------------

const SelectContent = ({
  className,
  children,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof SelectPrimitive.Popup> & { sideOffset?: number }) => (
  <SelectPrimitive.Positioner
    sideOffset={sideOffset}
    alignItemWithTrigger={false}
    align="start"
    // Popup is at least as wide as the trigger — avoids the narrow/centred look
    style={{ minWidth: "var(--anchor-width)" }}
  >
    <SelectPrimitive.Popup
      data-slot="select-popup"
      className={cn(
        // Surface
        "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover",
        "p-1 text-popover-foreground shadow-lg outline-none",
        // Enter/exit animation — opacity + slight upward slide
        "transition-[opacity,translate] duration-150",
        "data-[starting-style]:opacity-0 data-[starting-style]:-translate-y-1",
        "data-[ending-style]:opacity-0 data-[ending-style]:-translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.List>{children}</SelectPrimitive.List>
    </SelectPrimitive.Popup>
  </SelectPrimitive.Positioner>
);

// ---------------------------------------------------------------------------
// Item — individual option. Dim at rest, foreground + muted bg on highlight.
// Selected item shows a checkmark indicator.
// ---------------------------------------------------------------------------

const SelectItem = ({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    data-slot="select-item"
    className={cn(
      // Layout
      "flex cursor-default items-center gap-2 rounded-md px-3 py-1.5",
      // Text
      "text-sm text-hint outline-none",
      // Hover / highlight (keyboard navigation)
      "hover:bg-muted hover:text-foreground",
      "data-[highlighted]:bg-muted data-[highlighted]:text-foreground",
      // Selected
      "data-[selected]:text-foreground",
      // Transition
      "transition-colors",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    {/* Checkmark — only visible when this item is selected */}
    <SelectPrimitive.ItemIndicator className="ml-auto">
      <Check className="size-3" aria-hidden="true" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
);

// ---------------------------------------------------------------------------
// Group + GroupLabel — for organising options into labelled sections
// ---------------------------------------------------------------------------

const SelectGroup = ({ ...props }: ComponentProps<typeof SelectPrimitive.Group>) => (
  <SelectPrimitive.Group data-slot="select-group" {...props} />
);

const SelectGroupLabel = ({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.GroupLabel>) => (
  <SelectPrimitive.GroupLabel
    data-slot="select-group-label"
    className={cn("px-3 py-1 text-xs text-ghost", className)}
    {...props}
  />
);

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
};
