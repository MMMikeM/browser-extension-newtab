import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled).catch(console.error);
  }, []);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
      <Button variant="ghost" size="xs" onClick={() => router.navigate({ to: "/auth" })}>
        Sign in
      </Button>
    );
  }

  return (
    // relative wrapper — keeps header height stable regardless of panel state
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "gap-1.5",
          open
            ? "bg-muted text-muted-foreground"
            : syncState === "disconnected"
              ? "text-foreground"
              : "text-hint hover:text-muted-foreground",
        )}
        aria-label="Sync settings"
        aria-expanded={open}
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
      </Button>

      {open && currentUser && (
        // Absolutely positioned — does NOT affect header height
        <div className="absolute top-full right-0 z-50 mt-2 flex min-w-[180px] flex-col gap-3 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-foreground">{currentUser.name}</span>
            <span className="text-xs text-hint">@{currentUser.username}</span>
          </div>
          <div className="h-px bg-border" />
          {getBuildTarget() === "browser" && canInstall && (
            <Button variant="subtle" size="xs" className="justify-start" onClick={install}>
              Add to Home Screen
            </Button>
          )}
          {getBuildTarget() === "browser" && (
            <Button variant="subtle" size="xs" className="justify-start" onClick={handleTogglePush}>
              {pushEnabled ? "✓ Background sync on" : "Enable background sync"}
            </Button>
          )}
          <Button
            variant="subtle"
            size="xs"
            className="justify-start"
            onClick={() => {
              void router.navigate({ to: "/people" });
              setOpen(false);
            }}
          >
            People
          </Button>
          <Button
            variant="ghost"
            intent="destructive"
            size="xs"
            className="justify-start"
            onClick={handleLogout}
          >
            Sign out
          </Button>
          <div className="h-px bg-border" />
          <span className="text-[10px] text-ghost">{__BUILD_VERSION__}</span>
        </div>
      )}
    </div>
  );
};

export default SyncSettings;
