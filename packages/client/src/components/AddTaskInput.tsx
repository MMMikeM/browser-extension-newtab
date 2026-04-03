import { useState } from "react";
import { Input } from "~/components/ui/input";

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
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="What needs doing?"
        className="rounded-none border-0 border-b border-ghost/40 bg-transparent px-0 text-lg text-foreground placeholder:text-ghost transition-colors duration-200 focus-visible:border-hint focus-visible:ring-0 focus-visible:ring-transparent"
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- new tab page, this is the primary action
        autoFocus
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
