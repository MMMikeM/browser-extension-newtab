import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useCategories, useContacts } from "~/lib/db/hooks";
import { addCollaborator, removeCollaborator } from "~/lib/actions";
import { useAuthToken } from "~/lib/auth/token";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ColorDot } from "~/components/ui/color-dot";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import { SectionLabel } from "~/components/ui/section-label";
import { INBOX_COLOR } from "~/lib/constants";
import { ListRow } from "~/components/ui/list-row";
import { RevealButton, RevealGroup } from "~/components/ui/reveal-button";
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
      <DrawerContent className="max-w-sm border-x desk:translate-x-22 touch:max-w-none touch:border-x-0">
        <DrawerHeader className="gap-1 px-6 pt-4 pb-2 touch:px-5">
          <DrawerTitle className="font-display text-2xl leading-tight font-normal">
            Share category
          </DrawerTitle>
          {category && (
            <DrawerDescription className="flex items-center gap-2">
              <ColorDot size="sm" color={category.color ?? INBOX_COLOR} />
              {category.name}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex flex-col gap-6 px-6 pt-2 pb-8 touch:px-5">
          {collabs.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Shared with</SectionLabel>
              {collabs.map((collab) => (
                <ListRow key={collab.id} className="-mx-2">
                  <InitialsAvatar name={collab.name} size="md" />
                  <TextStack title={collab.name} subtitle={`@${collab.username}`} />
                  <RevealGroup>
                    <RevealButton onClick={() => handleRemove(collab.id)}>Remove</RevealButton>
                  </RevealGroup>
                </ListRow>
              ))}
            </div>
          )}

          {addableContacts.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionLabel>Add collaborator</SectionLabel>
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
                  variant="ghost"
                  size="sm"
                  onClick={handleAdd}
                  disabled={!selectedUsername || adding}
                  className="bg-primary-subtle px-4 text-primary hover:bg-primary-selected hover:text-primary touch:h-10"
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
