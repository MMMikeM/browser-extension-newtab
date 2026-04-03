import { useState } from "react";
import { useAuthToken } from "~/lib/auth-token";
import { useTasks } from "~/lib/hooks";

const DISMISSED_KEY = "newtab-todo-sync-hint-dismissed";

export function SyncHint({ onSignIn }: { onSignIn: () => void }) {
  const token = useAuthToken();
  const { data: tasks = [] } = useTasks();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "1",
  );

  // Only show when: not logged in, has tasks, not dismissed
  if (token || tasks.length === 0 || dismissed) return null;

  return (
    <p className="mt-1 text-xs text-hint">
      Saved on this device.{" "}
      <button
        onClick={onSignIn}
        className="underline underline-offset-2 hover:text-muted-foreground"
      >
        Sign in to sync
      </button>{" "}
      <button
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, "1");
          setDismissed(true);
        }}
        className="text-ghost hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </p>
  );
}
