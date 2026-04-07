import { useState } from "react";
import { Input } from "~/components/ui/field";

// On touch devices (PWA mobile), skip autofocus — opening the keyboard on mount
// is jarring and prevents the layout from settling before the user interacts.
const IS_TOUCH =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const title = value.trim();
        if (!title) return;
        onAdd(title);
        setValue("");
      }}
    >
      <Input
        id="add-task-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What needs doing?"
        className="text-lg"
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- new tab page, primary action; suppressed on mobile
        autoFocus={!IS_TOUCH}
      />
      {/* Submit hint — appears when there's text, teaches the Enter affordance without permanent noise */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-ghost/60 transition-opacity duration-150"
        style={{ opacity: value.trim() ? 1 : 0 }}
      >
        ↵
      </span>
    </form>
  );
}
