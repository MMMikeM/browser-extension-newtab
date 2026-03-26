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
        placeholder="Add a task..."
        autoFocus
      />
    </form>
  );
}
