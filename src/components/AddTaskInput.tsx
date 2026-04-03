import { useState } from "react";
import { Input } from "~/components/ui/input";

export function AddTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
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
        className="border-transparent bg-transparent text-base placeholder:text-hint focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-transparent"
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- new tab page, this is the primary action
        autoFocus
      />
    </form>
  );
}
