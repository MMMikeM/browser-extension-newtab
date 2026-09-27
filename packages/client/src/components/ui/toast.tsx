import { type CSSProperties } from "react";
import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const DURATION = 5000;

export const Toasts = () => {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const duration = toast.timeout ?? DURATION;
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        // Presence-only attribute — queried by handleDelete's view transition callback
        // to assign viewTransitionName after flushSync renders the portal.
        data-toast-undo=""
        className={cn(
          "group/toast",
          // Stacking layout — Base UI sets --toast-index, --toast-height, etc.
          "[--gap:0.75rem] [--peek:0.625rem]",
          "[--scale:calc(max(0,1-(var(--toast-index)*0.075)))]",
          "[--shrink:calc(1-var(--scale))]",
          "[--height:var(--toast-frontmost-height,var(--toast-height))]",
          "absolute right-0 bottom-0 left-0 w-full origin-bottom select-none",
          "z-[calc(1000-var(--toast-index))]",
          "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
          // Hover-gap bridge so pointer can reach lower toasts
          "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
          // Card styling
          "overflow-hidden rounded-lg border border-border bg-card shadow-lg",
          "h-[var(--height)]",
          // Enter
          "data-[starting-style]:[transform:translateY(150%)]",
          // Exit: slide down + fade (non-swipe)
          "data-[ending-style]:opacity-0",
          "data-[limited]:opacity-0",
          "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
          // Swipe exits
          "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(0)]",
          "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(0)]",
          "data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
          "data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
          "[transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s]",
        )}
      >
        <Toast.Content className="py-2.5 pr-2.5 pl-4">
          <div className="flex items-center gap-2 text-sm">
            {/* select-text: the invite fallback asks the reader to copy the link from here */}
            <Toast.Title className="min-w-0 flex-1 text-hint select-text [overflow-wrap:anywhere]" />
            {toast.data?.onUndo && (
              <Toast.Action
                render={<Button variant="link" className="h-8 px-2 touch:h-9" />}
                onClick={() => toast.data.onUndo()}
              >
                Undo
              </Toast.Action>
            )}
            <Toast.Close
              render={
                <Button
                  variant="subtle"
                  size="xs"
                  icon
                  aria-label="Dismiss"
                  className="touch:size-9"
                />
              }
            >
              <X className="size-3.5" />
            </Toast.Close>
          </div>
          {/* Tracks the toast's own timeout, and holds while Base UI pauses it (hover or
              focus sets data-expanded). Persistent toasts (timeout 0) get no bar. */}
          {duration > 0 && (
            <div
              className="absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[toast-progress_var(--toast-duration)_linear_forwards] bg-primary/40 group-data-[expanded]/toast:[animation-play-state:paused] motion-reduce:hidden"
              style={{ "--toast-duration": `${duration}ms` } as CSSProperties}
            />
          )}
        </Toast.Content>
      </Toast.Root>
    );
  });
};

export { Toast };
