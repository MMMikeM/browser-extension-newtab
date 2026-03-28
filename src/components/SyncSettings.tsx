import { useEffect, useState } from "react";
import { useValue } from "@legendapp/state/react";
import { authToken$ } from "~/lib/store";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "~/lib/push";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const TOKEN_KEY = "newtab-todo-token";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

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
        {token ? "⟳" : "⚙"}
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
            if (input.trim()) {
              localStorage.setItem(TOKEN_KEY, input.trim());
              authToken$.set(input.trim());
            }
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
              localStorage.removeItem(TOKEN_KEY);
              authToken$.set(null);
              unregisterPushSubscription();
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
      {token && (
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
