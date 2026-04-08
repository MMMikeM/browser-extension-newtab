import { ChevronDown } from "lucide-react";
import { AddTaskInput } from "~/components/AddTaskInput";
import { useCategories } from "~/lib/db/hooks";
import { addTask } from "~/lib/db/add-task";
import { useActiveCategoryId } from "~/lib/state/active-category";
import { useNavContext } from "~/lib/state/nav-context";
import { INBOX_COLOR } from "~/lib/constants";

export function TaskInputBar() {
  const activeCategoryId = useActiveCategoryId();
  const { data: rawCategories } = useCategories();
  const { setNavOpen } = useNavContext();

  const activeCategory = activeCategoryId
    ? ((rawCategories ?? []).find((c) => c.id === activeCategoryId) ?? null)
    : null;

  const handleAdd = (title: string) => addTask(title, activeCategoryId ?? null);

  return (
    <div className="touch:order-2 touch:shrink-0 touch:-mx-6 touch:px-6 touch:border-t touch:border-ghost touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
      <button
        data-testid="category-input-chip"
        onClick={() => setNavOpen(true)}
        className="hidden touch:flex items-center gap-2 mb-3 transition-colors active:opacity-70"
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: activeCategory?.color ?? INBOX_COLOR }}
        />
        <span className="text-sm font-medium text-foreground">
          {activeCategory?.name ?? "Inbox"}
        </span>
        <ChevronDown size={12} className="text-hint" />
      </button>
      <AddTaskInput onAdd={handleAdd} />
    </div>
  );
}
