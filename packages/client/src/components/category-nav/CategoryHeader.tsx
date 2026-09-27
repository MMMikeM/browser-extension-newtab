import { ChevronDown } from "lucide-react";
import { useCategories, useTasks } from "~/lib/db/hooks";
import { useOptimisticUserId } from "~/lib/auth/current-user";
import { useActiveCategoryId } from "~/lib/state/active-category";
import { useNavContext } from "~/lib/state/nav-context";
import { useCollaboratedCategoryIds } from "~/lib/hooks/use-collaborated-categories";
import { countOpenTasksByCategory } from "~/lib/effective-category";
import { INBOX_COLOR } from "~/lib/constants";
import { ColorDot } from "~/components/ui/color-dot";

/**
 * List title above the task list. Anchors the screen with the name of the list
 * being read. Where the sidebar doesn't fit (touch, narrow windows) it also opens
 * the category sheet; beside the desktop sidebar it is a plain heading.
 */
export function CategoryHeader() {
  const activeCategoryId = useActiveCategoryId();
  const userId = useOptimisticUserId();
  const { data: categories } = useCategories();
  const { data: tasks } = useTasks();
  const collaboratedCategoryIds = useCollaboratedCategoryIds(userId);
  const { setNavOpen } = useNavContext();

  const active = activeCategoryId
    ? (categories ?? []).find((c) => c.id === activeCategoryId)
    : undefined;
  const openCount =
    countOpenTasksByCategory(tasks ?? [], userId, collaboratedCategoryIds).get(activeCategoryId) ??
    0;

  return (
    <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
      <h2 className="flex min-w-0 flex-1">
        <button
          data-testid="category-nav-trigger"
          onClick={() => setNavOpen(true)}
          aria-haspopup="dialog"
          className="-ml-1.5 flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-opacity active:opacity-60 desk:hidden"
        >
          <ColorDot color={active?.color ?? INBOX_COLOR} className="mt-1" />
          <span className="truncate font-display text-[1.75rem] leading-tight text-foreground">
            {active?.name ?? "Inbox"}
          </span>
          <ChevronDown size={18} className="mt-1.5 shrink-0 text-hint" aria-hidden="true" />
        </button>
        <span className="hidden min-w-0 items-center gap-2.5 py-1 desk:flex">
          <ColorDot color={active?.color ?? INBOX_COLOR} className="mt-1" />
          <span className="truncate font-display text-[1.75rem] leading-tight text-foreground">
            {active?.name ?? "Inbox"}
          </span>
        </span>
      </h2>
      {openCount > 0 && (
        <span className="text-sm text-hint tabular-nums">
          {openCount}
          <span className="sr-only"> open</span>
        </span>
      )}
    </div>
  );
}
