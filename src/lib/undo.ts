import { createExternalStore } from "~/lib/external-store";

interface UndoEntry {
  message: string;
  undo: () => void;
  timerId: ReturnType<typeof setTimeout>;
}

const store = createExternalStore<UndoEntry | null>(null);

const UNDO_TIMEOUT = 5000;

export const pushUndo = (message: string, undo: () => void) => {
  const prev = store.get();
  if (prev) clearTimeout(prev.timerId);

  const timerId = setTimeout(() => store.set(null), UNDO_TIMEOUT);
  store.set({ message, undo, timerId });
};

export const executeUndo = () => {
  const entry = store.get();
  if (!entry) return;
  clearTimeout(entry.timerId);
  entry.undo();
  store.set(null);
};

export const dismissUndo = () => {
  const entry = store.get();
  if (entry) clearTimeout(entry.timerId);
  store.set(null);
};

export const useUndoEntry = store.useStore;
