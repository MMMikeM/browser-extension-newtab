import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useAuthToken, setAuthToken } from "~/lib/auth/token";
import { useCurrentUser, clearCurrentUser } from "~/lib/auth/current-user";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  isPushSubscribed,
} from "~/lib/sync/push";
import { logout } from "~/lib/actions";
import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";
import { useSyncState, usePendingMutations } from "~/lib/sync/sse";
import { useInstallPrompt } from "~/lib/hooks/use-install-prompt";
import { Button } from "~/components/ui/button";
import { MenuItem } from "~/components/ui/menu-item";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

const clearAuth = () => {
  setAuthToken(null);
  clearCurrentUser();
  if (getBuildTarget() === "extension") {
    browser.storage.local
      .remove(TOKEN_KEY)
      .then(() => browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {}))
      .catch(console.error);
  }
  // Handles its own errors
  void unregisterPushSubscription();
};

const SYNC_LABELS = { connecting: "Syncing…", disconnected: "Offline", connected: "Sync" } as const;

export const SyncSettings = () => {
  const token = useAuthToken();
  const currentUser = useCurrentUser();
  const syncState = useSyncState();
  const hasPending = usePendingMutations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled).catch(console.error);
  }, []);

  const handleTogglePush = async () => {
    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
    if (pushEnabled) {
      await unregisterPushSubscription();
      setPushEnabled(false);
    } else {
      const ok = await registerPushSubscription(VAPID_PUBLIC_KEY);
      setPushEnabled(ok);
    }
  };

  const handleLogout = async () => {
    await logout();
    clearAuth();
    setPushEnabled(false);
    setOpen(false);
  };

  const isAuthPage = useRouterState({ select: (s) => s.location.pathname === "/auth" });

  if (!token) {
    if (isAuthPage) return null;
    return (
      <Button
        variant="ghost"
        size="xs"
        className="relative touch:h-9 touch:px-3 touch:text-sm touch:after:absolute touch:after:inset-x-0 touch:after:-inset-y-1"
        onClick={() => router.navigate({ to: "/auth" })}
      >
        Sign in
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="xs"
            className={cn(
              // after: 44px touch target without growing the header
              "relative gap-1.5 touch:h-9 touch:px-3 touch:after:absolute touch:after:inset-x-0 touch:after:-inset-y-1",
              syncState === "disconnected"
                ? "text-foreground"
                : "text-hint hover:text-muted-foreground",
            )}
            aria-label="Sync settings"
          />
        }
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full transition-colors",
            syncState === "disconnected"
              ? "bg-destructive"
              : hasPending || syncState === "connecting"
                ? "animate-pulse bg-pending"
                : "bg-primary-subtle",
          )}
        />
        {/* Connected idle: ghost label — whispers affordance without competing.
            Pending/connecting: hint level — active state deserves presence.
            Disconnected: full foreground — error demands attention. */}
        <span className={cn(syncState === "disconnected" && "font-medium")}>
          {hasPending && syncState !== "disconnected" ? "Syncing…" : SYNC_LABELS[syncState]}
        </span>
      </PopoverTrigger>

      {currentUser && (
        // backdrop: the tap that dismisses the menu shouldn't also open the task underneath
        <PopoverContent
          align="end"
          sideOffset={8}
          backdrop
          aria-label="Account"
          className="flex min-w-[200px] flex-col p-2"
        >
          <div className="flex flex-col gap-0.5 px-2.5 pt-1 pb-2">
            <span className="text-sm font-medium text-foreground">{currentUser.name}</span>
            <span className="text-xs text-hint">@{currentUser.username}</span>
          </div>
          <div className="mb-1 h-px bg-border" />
          {getBuildTarget() === "browser" && canInstall && (
            <MenuItem onClick={install}>Add to Home Screen</MenuItem>
          )}
          {getBuildTarget() === "browser" && (
            <MenuItem onClick={handleTogglePush}>
              {pushEnabled ? (
                <>
                  Background sync on
                  <Check data-icon="inline-end" className="ml-auto text-primary" />
                </>
              ) : (
                "Enable background sync"
              )}
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              void router.navigate({ to: "/people" });
              setOpen(false);
            }}
          >
            People
          </MenuItem>
          <MenuItem intent="destructive" onClick={handleLogout}>
            Sign out
          </MenuItem>
          <div className="my-1 h-px bg-border" />
          <span className="px-2.5 pb-0.5 text-[10px] text-hint">{__BUILD_VERSION__}</span>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default SyncSettings;
