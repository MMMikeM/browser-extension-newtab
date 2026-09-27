import { useState } from "react";
import { CloudOff, X } from "lucide-react";
import { useAuthToken } from "~/lib/auth/token";
import { Button } from "~/components/ui/button";
import { Link } from "~/components/ui/link";
import { useTasks } from "~/lib/db/hooks";

const DISMISSED_KEY = "newtab-todo-sync-hint-dismissed-until";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function SyncHint() {
  const token = useAuthToken();
  const { data: tasks = [] } = useTasks();
  const [dismissed, setDismissed] = useState(() => {
    const until = localStorage.getItem(DISMISSED_KEY);
    return until !== null && Date.now() < Number(until);
  });

  if (token || tasks.length === 0 || dismissed) return null;

  return (
    <div className="mt-1.5 flex items-center gap-2 border-b border-border pb-2 text-xs text-hint">
      <CloudOff className="size-3.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        Saved on this device. <Link to="/auth">Sign in to sync across devices</Link>
      </p>
      <Button
        variant="subtle"
        size="xs"
        icon
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DURATION_MS));
          setDismissed(true);
        }}
        className="-mr-1.5 shrink-0 touch:size-8"
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </div>
  );
}

export default SyncHint;
