import { useEffect, useState } from "react";
import { useValue } from "@legendapp/state/react";
import { authToken$ } from "~/lib/auth-token";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "~/lib/push";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  authToken$.set(token);
  const target = getBuildTarget();
  if (target === "browser") {
    fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }
  if (target === "extension") {
    browser.storage.local.set({ [TOKEN_KEY]: token });
    browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {});
  }
};

const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  authToken$.set(null);
  if (getBuildTarget() === "extension") {
    browser.storage.local.remove(TOKEN_KEY);
    browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {});
  }
  unregisterPushSubscription();
};

export function SyncSettings() {
  const token = useValue(authToken$);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const handleTogglePush = async () => {
    if (pushEnabled) {
      await unregisterPushSubscription();
      setPushEnabled(false);
    } else {
      const ok = await registerPushSubscription(VAPID_PUBLIC_KEY);
      setPushEnabled(ok);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Sync settings"
      >
        ⚙
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={token ? "Change sync token..." : "Enter sync token..."}
          className="h-7 w-48 text-xs"
        />
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            const trimmed = input.trim();
            if (trimmed) setAuthToken(trimmed);
            setInput("");
            setOpen(false);
          }}
        >
          Save
        </Button>
        {token && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              clearAuthToken();
              setPushEnabled(false);
              setInput("");
              setOpen(false);
            }}
          >
            Disconnect
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {token && getBuildTarget() === "browser" && (
        <button
          onClick={handleTogglePush}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {pushEnabled ? "✓ Background sync enabled" : "Enable background sync"}
        </button>
      )}
    </div>
  );
}
