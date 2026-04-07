import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCategories, useContacts } from "~/lib/db/hooks";
import { addCollaborator, removeCollaborator } from "~/lib/actions";
import { useAuthToken } from "~/lib/auth/token";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function CategoryCollabSheet({
  categoryId,
  open,
  onClose,
}: {
  categoryId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState("");

  const { data: allCategories = [] } = useCategories();
  const { data: allContacts = [] } = useContacts();

  const category = allCategories.find((c) => c.id === categoryId);
  const collabs = (category?.collaborators ?? []).flatMap((c) => (c.user ? [c.user] : []));

  const isAuthed = !!useAuthToken();
  const collabIds = new Set(collabs.map((c) => c.id));
  const addableContacts = isAuthed
    ? allContacts.filter((c) => c.contactUser && !collabIds.has(c.contactUserId))
    : [];

  const handleAdd = async () => {
    if (!selectedUsername) return;
    setAdding(true);
    setError(null);
    try {
      await addCollaborator(categoryId, selectedUsername);
      setSelectedUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeCollaborator(categoryId, userId);
    } catch {
      // ignore — collection will stay consistent
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Share category</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-5 pb-8 pt-2">
          {collabs.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">Shared with</p>
              {collabs.map((collab) => (
                <div
                  key={collab.id}
                  className="group/collab flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                >
                  <div className="size-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                    {collab.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{collab.name}</span>
                    <span className="text-xs text-muted-foreground">@{collab.username}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(collab.id)}
                    className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/collab:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {addableContacts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Add collaborator</p>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedUsername}
                  onValueChange={(v) => {
                    setSelectedUsername(v as string);
                    setError(null);
                  }}
                >
                  <SelectTrigger className="flex-1" aria-label="Add collaborator">
                    <SelectValue placeholder="Select a contact…" />
                  </SelectTrigger>
                  <SelectContent>
                    {addableContacts.map((c) => (
                      <SelectItem key={c.contactUserId} value={c.contactUser!.username}>
                        {c.contactUser!.name} (@{c.contactUser!.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdd}
                  disabled={!selectedUsername || adding}
                >
                  Add
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}

          {addableContacts.length === 0 && collabs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No contacts yet.{" "}
              <Link to="/people" className="underline hover:text-foreground">
                Invite someone
              </Link>{" "}
              to share this category.
            </p>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom,12px)] min-h-3" />
      </DrawerContent>
    </Drawer>
  );
}
