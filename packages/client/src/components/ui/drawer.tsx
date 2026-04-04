import { ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "~/lib/utils";

const Drawer = ({ ...props }: ComponentProps<typeof DrawerPrimitive.Root>) => {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
};

const DrawerTrigger = ({ ...props }: ComponentProps<typeof DrawerPrimitive.Trigger>) => {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
};

const DrawerClose = ({ ...props }: ComponentProps<typeof DrawerPrimitive.Close>) => {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
};

const DrawerContent = ({
  className,
  children,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Popup>) => {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        data-slot="drawer-backdrop"
        className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-[swiping]:duration-0 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]"
      />
      <DrawerPrimitive.Viewport className="fixed inset-0 z-50 flex items-end justify-center touch-none">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "flex h-auto max-h-[80vh] w-full flex-col rounded-t-xl border-t border-border bg-popover text-sm text-popover-foreground",
            "[transform:translateY(var(--drawer-swipe-movement-y,0px))]",
            "transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            "data-[swiping]:select-none data-[swiping]:duration-0",
            "data-[starting-style]:[transform:translateY(calc(100%+2px))]",
            "data-[ending-style]:[transform:translateY(calc(100%+2px))]",
            "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength,1)*400ms)]",
            className,
          )}
          {...props}
        >
          <div className="mx-auto mt-4 h-1.5 w-[100px] shrink-0 rounded-full bg-muted" />
          <DrawerPrimitive.Content className="overflow-y-auto overscroll-contain">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
};

const DrawerHeader = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-0.5 p-4 md:gap-1.5", className)}
      {...props}
    />
  );
};

const DrawerFooter = ({ className, ...props }: ComponentProps<"div">) => {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
};

const DrawerTitle = ({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Title>) => {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
};

const DrawerDescription = ({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) => {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
};

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
