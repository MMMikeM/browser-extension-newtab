import { useState } from "react";
import { useAuthToken } from "~/lib/auth-token";
import { useTasks } from "~/lib/hooks";

const DISMISSED_KEY = "newtab-todo-sync-hint-dismissed-until";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function SyncHint({ onSignIn }: { onSignIn: () => void }) {
  const token = useAuthToken();
  const { data: tasks = [] } = useTasks();
  const [dismissed, setDismissed] = useState(() => {
    const until = localStorage.getItem(DISMISSED_KEY);
    return until !== null && Date.now() < Number(until);
  });

  // Only show when: not logged in, has tasks, not dismissed
  if (token || tasks.length === 0 || dismissed) return null;

  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      Saved on this device.{" "}
      <button onClick={onSignIn} className="underline underline-offset-2 hover:text-foreground">
        Sign in to sync across devices
      </button>{" "}
      <button
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DURATION_MS));
          setDismissed(true);
        }}
        className="text-hint hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </p>
  );
}

export default SyncHint;
