import { useState } from "react";
import { useValue } from "@legendapp/state/react";
import { authToken$ } from "~/lib/store";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const TOKEN_KEY = "newtab-todo-token";

export function SyncSettings() {
  const token = useValue(authToken$);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Sync settings"
      >
        {token ? "⟳" : "⚙"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="password"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={token ? "Change sync token..." : "Enter sync token..."}
        className="h-7 w-48 text-xs"
      />
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={() => {
          if (input.trim()) {
            localStorage.setItem(TOKEN_KEY, input.trim());
            authToken$.set(input.trim());
          }
          setInput("");
          setOpen(false);
        }}
      >
        Save
      </Button>
      {token && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            authToken$.set(null);
            setInput("");
            setOpen(false);
          }}
        >
          Disconnect
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}
