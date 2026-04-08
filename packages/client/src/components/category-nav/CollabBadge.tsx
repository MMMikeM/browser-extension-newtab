import { Users } from "lucide-react";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import type { Category } from "~/lib/types";

export function CollabBadge({
  category,
  currentUserId,
}: {
  category: Category;
  currentUserId: string;
}) {
  const isOwned = category.userId === currentUserId;
  const others = category.collaborators?.filter((c) => c.user?.id !== currentUserId) ?? [];
  const peerCount = others.length + (isOwned ? 0 : 1);

  if (peerCount === 0) return null;

  if (peerCount === 1) {
    const name = isOwned
      ? (others[0]?.user?.name ?? "?")
      : (category.user?.name ?? others[0]?.user?.name ?? "?");
    return <InitialsAvatar name={name} className="bg-collab text-collab-foreground" />;
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-hint">
      <Users size={12} />
    </span>
  );
}
