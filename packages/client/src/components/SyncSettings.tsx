import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuthToken, setAuthToken } from "~/lib/auth-token";
import { useCurrentUser, clearCurrentUser } from "~/lib/current-user";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "~/lib/push";
import { client } from "~/lib/api";
import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";
import { useSyncState, usePendingMutations } from "~/lib/sse";
import { cn } from "~/lib/utils";

const clearAuth = () => {
  setAuthToken(null);
  clearCurrentUser();
  if (getBuildTarget() === "extension") {
    browser.storage.local
      .remove(TOKEN_KEY)
      .then(() => browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => { }));
  }
  unregisterPushSubscription();
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

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
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
    try {
      await client.api.auth.logout.$post();
    } catch {
      // Still clear local state even if server call fails
    }
    clearAuth();
    setPushEnabled(false);
    setOpen(false);
  };

  if (!token) {
    return (
      <button
        onClick={() => router.navigate({ to: "/auth" })}
        className="rounded-md px-2 py-1 text-xs text-hint transition-colors hover:bg-muted hover:text-muted-foreground"
      >
        Sign in
      </button>
    );
  }

  return (
    // relative wrapper — keeps header height stable regardless of panel state
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
          open
            ? "bg-muted text-muted-foreground"
            : syncState === "disconnected"
              ? "text-foreground hover:bg-muted"
              : hasPending || syncState === "connecting"
                ? "text-hint hover:bg-muted hover:text-muted-foreground"
                : "text-ghost hover:bg-muted hover:text-muted-foreground",
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
                ? "animate-pulse bg-amber-500"
                : "bg-primary/50",
          )}
        />
        {/* Connected idle: ghost label — whispers affordance without competing.
            Pending/connecting: hint level — active state deserves presence.
            Disconnected: full foreground — error demands attention. */}
        <span className={cn(syncState === "disconnected" && "font-medium")}>
          {hasPending && syncState !== "disconnected" ? "Syncing…" : SYNC_LABELS[syncState]}
        </span>
      </button>

      {open && currentUser && (
        // Absolutely positioned — does NOT affect header height
        <div className="absolute right-0 top-full z-50 mt-2 flex min-w-[180px] flex-col gap-3 rounded-lg border border-border bg-popover p-3 shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-foreground">{currentUser.name}</span>
            <span className="text-xs text-hint">@{currentUser.username}</span>
          </div>
          <div className="h-px bg-border" />
          {getBuildTarget() === "browser" && (
            <button
              onClick={handleTogglePush}
              className="text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {pushEnabled ? "✓ Background sync on" : "Enable background sync"}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-left text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default SyncSettings