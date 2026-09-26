import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "~/lib/utils";

const Popover = (props: PopoverPrimitive.Root.Props) => {
  return <PopoverPrimitive.Root {...props} />;
};

const PopoverTrigger = (props: PopoverPrimitive.Trigger.Props) => {
  return <PopoverPrimitive.Trigger {...props} />;
};

const PopoverContent = ({
  className,
  sideOffset = 4,
  align,
  side,
  backdrop = false,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "sideOffset" | "align" | "side"> & {
    /**
     * Invisible click-catcher. Base UI dismisses on touch pointerdown, so without it the
     * rest of the dismissing tap lands on whatever is underneath. The exit transition
     * keeps it mounted until that click has been swallowed.
     */
    backdrop?: boolean;
  }) => {
  return (
    <PopoverPrimitive.Portal>
      {backdrop && (
        <PopoverPrimitive.Backdrop className="fixed inset-0 z-50 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      )}
      <PopoverPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        side={side}
        collisionPadding={12}
        className="z-50"
      >
        <PopoverPrimitive.Popup
          className={cn(
            "min-w-[8rem] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            "transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
};

const PopoverClose = (props: PopoverPrimitive.Close.Props) => {
  return <PopoverPrimitive.Close {...props} />;
};

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
