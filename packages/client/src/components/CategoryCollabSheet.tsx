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
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import { ListRow } from "~/components/ui/list-row";
import { RevealButton } from "~/components/ui/reveal-button";
import { TextStack } from "~/components/ui/text-stack";

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
        <div className="flex flex-col gap-4 px-5 pt-2 pb-8">
          {collabs.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-hint">Shared with</p>
              {collabs.map((collab) => (
                <ListRow key={collab.id}>
                  <InitialsAvatar name={collab.name} size="md" />
                  <TextStack title={collab.name} subtitle={`@${collab.username}`} />
                  <RevealButton onClick={() => handleRemove(collab.id)}>Remove</RevealButton>
                </ListRow>
              ))}
            </div>
          )}

          {addableContacts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-hint">Add collaborator</p>
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
            <p className="text-sm text-hint">
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
