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
    return (
      <InitialsAvatar name={name} className="bg-[oklch(0.55_0.07_228)] text-[oklch(0.95_0.01_80)]" />
    );
  }

  return (
    <span className="shrink-0 size-4 flex items-center justify-center text-hint">
      <Users size={12} />
    </span>
  );
}
