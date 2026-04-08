import { ChevronDown } from "lucide-react";
import { AddTaskInput } from "~/components/AddTaskInput";
import { useCategories } from "~/lib/db/hooks";
import { CollabBadge } from "~/components/category-nav/CollabBadge";
import { addTask } from "~/lib/db/add-task";
import { useOptimisticUserId } from "~/lib/auth/current-user";
import { useActiveCategoryId } from "~/lib/state/active-category";
import { useNavContext } from "~/lib/state/nav-context";
import { INBOX_COLOR } from "~/lib/constants";
import { ColorDot } from "~/components/ui/color-dot";

export function TaskInputBar() {
  const activeCategoryId = useActiveCategoryId();
  const currentUserId = useOptimisticUserId();
  const { data: rawCategories } = useCategories();
  const { setNavOpen } = useNavContext();

  const activeCategory = activeCategoryId
    ? ((rawCategories ?? []).find((c) => c.id === activeCategoryId) ?? null)
    : null;

  const handleAdd = (title: string) => addTask(title, activeCategoryId ?? null);

  return (
    <div className="touch:order-2 touch:-mx-6 touch:shrink-0 touch:border-t touch:border-ghost touch:px-6 touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
      <button
        data-testid="category-input-chip"
        onClick={() => setNavOpen(true)}
        className="mb-3 hidden items-center gap-2 transition-colors active:opacity-70 touch:flex"
      >
        <ColorDot color={activeCategory?.color ?? INBOX_COLOR} />
        <span className="text-sm font-medium text-foreground">
          {activeCategory?.name ?? "Inbox"}
        </span>
        {activeCategory && <CollabBadge category={activeCategory} currentUserId={currentUserId} />}
        <ChevronDown size={12} className="text-hint" />
      </button>
      <AddTaskInput onAdd={handleAdd} />
    </div>
  );
}
