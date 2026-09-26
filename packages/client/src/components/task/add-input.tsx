import { useState } from "react";
import { ArrowUp, CornerDownLeft } from "lucide-react";
import { Input } from "~/components/ui/field";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// On touch devices (PWA mobile), skip autofocus — opening the keyboard on mount
// is jarring and prevents the layout from settling before the user interacts.
const IS_TOUCH =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  const hasText = value.trim().length > 0;

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
        className="text-lg md:text-lg touch:pr-11"
        autoComplete="off"
        enterKeyHint="enter"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- new tab page, primary action; suppressed on mobile
        autoFocus={!IS_TOUCH}
      />
      {/* Submit hint — appears when there's text, teaches the Enter affordance without permanent noise */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-ghost transition-opacity duration-150 touch:hidden"
        style={{ opacity: hasText ? 1 : 0 }}
      >
        <CornerDownLeft className="size-3.5" />
      </span>
      {/* Touch: an explicit add button, since the keyboard's return key isn't an obvious "save" */}
      <Button
        type="submit"
        size="sm"
        icon
        aria-label="Add task"
        tabIndex={hasText ? 0 : -1}
        // Keep focus in the input so the keyboard stays up for the next task
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          // inset-y-0 + my-auto rather than a translate: Button nudges translate-y on :active
          // after: 44px hit area around the 32px button
          "absolute inset-y-0 right-0 my-auto hidden rounded-full bg-primary-subtle text-primary transition-[opacity,scale] duration-150 after:absolute after:-inset-1.5 active:bg-primary-selected touch:inline-flex",
          !hasText && "pointer-events-none scale-75 opacity-0",
        )}
      >
        <ArrowUp className="size-4" strokeWidth={2.5} />
      </Button>
    </form>
  );
}
