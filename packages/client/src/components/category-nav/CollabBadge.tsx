import { Users } from "lucide-react";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import type { Category } from "~/lib/types";

const listNames = new Intl.ListFormat(undefined, { type: "conjunction" });

/** A face always means whose list it is, so your own shared list never shows a collaborator's. */
export function CollabBadge({
  category,
  currentUserId,
}: {
  category: Category;
  currentUserId: string;
}) {
  if (category.userId !== currentUserId) {
    const owner = category.user?.name ?? "?";
    return (
      <>
        <span aria-hidden="true" className="shrink-0">
          <InitialsAvatar name={owner} className="bg-collab text-collab-foreground" />
        </span>
        <span className="sr-only">{owner}'s list</span>
      </>
    );
  }

  const sharedWith =
    category.collaborators?.flatMap((c) =>
      c.user && c.user.id !== currentUserId ? [c.user.name] : [],
    ) ?? [];
  if (sharedWith.length === 0) return null;

  const label = `Shared with ${listNames.format(sharedWith)}`;
  return (
    <span title={label} className="flex size-4 shrink-0 items-center justify-center text-hint">
      <Users size={12} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
