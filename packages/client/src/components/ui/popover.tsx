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
  ...props
}: PopoverPrimitive.Popup.Props & { sideOffset?: number }) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={sideOffset} className="z-50">
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

export { Popover, PopoverTrigger, PopoverContent };
