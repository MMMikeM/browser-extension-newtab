import { useEffect, useState } from "react";
import { useUndoEntry, executeUndo, dismissUndo } from "~/lib/undo";

const UNDO_TIMEOUT = 5000;

export function UndoToast() {
  const entry = useUndoEntry();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (entry) {
      setVisible(true);
      setProgress(100);
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, 100 - (elapsed / UNDO_TIMEOUT) * 100);
        setProgress(remaining);
        if (remaining <= 0) clearInterval(interval);
      }, 50);
      return () => clearInterval(interval);
    }
    const timer = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(timer);
  }, [entry]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg transition-opacity duration-200"
      style={{ opacity: entry ? 1 : 0 }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{entry?.message}</span>
        <button onClick={executeUndo} className="font-medium text-primary hover:underline">
          Undo
        </button>
        <button
          onClick={dismissUndo}
          className="text-hint hover:text-muted-foreground"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-ghost transition-none"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
