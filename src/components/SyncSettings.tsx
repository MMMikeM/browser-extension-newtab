import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuthToken, setAuthToken } from "~/lib/auth-token";
import { useCurrentUser, clearCurrentUser } from "~/lib/current-user";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "~/lib/push";
import { client } from "~/lib/api";
import { Button } from "~/components/ui/button";
import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";
import { useSyncState } from "~/lib/sse";
import { cn } from "~/lib/utils";

const clearAuth = () => {
  setAuthToken(null);
  clearCurrentUser();
  if (getBuildTarget() === "extension") {
    browser.storage.local.remove(TOKEN_KEY).then(() =>
      browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {}),
    );
  }
  unregisterPushSubscription();
};

export function SyncSettings() {
  const token = useAuthToken();
  const currentUser = useCurrentUser();
  const syncState = useSyncState();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
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
    try {
      await client.api.auth.logout.$post();
    } catch {
      // Still clear local state even if server call fails
    }
    clearAuth();
    setPushEnabled(false);
    setOpen(false);
  };

  if (!open) {
    if (token) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="group relative flex items-center"
          aria-label="Sync settings"
        >
          <span
            className={cn(
              "size-2 rounded-full transition-colors",
              syncState === "connected"
                ? "bg-primary"
                : syncState === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-ghost",
            )}
          />
        </button>
      );
    }

    return (
      <button
        onClick={() => router.navigate({ to: "/auth" })}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Sign in"
      >
        &#x2699;
      </button>
    );
  }

  if (token && currentUser) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {currentUser.name} (@{currentUser.username})
        </span>
        <span className="text-xs text-hint">
          {syncState === "connected"
            ? "Syncing"
            : syncState === "connecting"
              ? "Connecting..."
              : "Offline"}
        </span>
        {getBuildTarget() === "browser" && (
          <button
            onClick={handleTogglePush}
            className="text-left text-xs text-muted-foreground hover:text-foreground"
          >
            {pushEnabled ? "\u2713 Background sync enabled" : "Enable background sync"}
          </button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleLogout}>
            Log out
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Edge case: token exists but no user info — send to auth page
  router.navigate({ to: "/auth" });
  return null;
}
