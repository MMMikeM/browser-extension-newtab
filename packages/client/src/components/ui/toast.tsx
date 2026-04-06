import { Toast } from "@base-ui/react/toast";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const DURATION = 5000;

export const Toasts = () => {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      // Presence-only attribute — queried by handleDelete's view transition callback
      // to assign viewTransitionName after flushSync renders the portal.
      data-toast-undo=""
      className={cn(
        "relative overflow-hidden rounded-lg border border-border",
        "bg-card px-4 py-2.5 shadow-lg w-[min(360px,90vw)]",
        // Enter: non-morph path (toggle/category undos + Firefox fallback)
        "data-[starting-style]:translate-y-3 data-[starting-style]:opacity-0",
        // Exit: slide down + fade
        "data-[ending-style]:translate-y-3 data-[ending-style]:opacity-0",
        "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        // Swipe exits
        "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(110%)]",
        "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(-110%)]",
      )}
    >
      <Toast.Content>
        <div className="flex items-center gap-3 text-sm">
          <Toast.Title className="flex-1 text-muted-foreground" />
          {toast.data?.onUndo && (
            <Toast.Action
              render={<Button variant="link" />}
              onClick={() => toast.data.onUndo()}
            >
              Undo
            </Toast.Action>
          )}
          <Toast.Close
            render={<Button variant="subtle" size="icon-xs" aria-label="Dismiss" />}
          >
            ×
          </Toast.Close>
        </div>
        {/* CSS-only countdown bar — replaces the old setInterval approach */}
        <div
          className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-primary/50"
          style={{ animation: `toast-progress ${DURATION}ms linear forwards` }}
        />
      </Toast.Content>
    </Toast.Root>
  ));
};

export { Toast };
