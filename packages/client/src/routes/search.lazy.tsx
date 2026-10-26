import { useEffect, useRef, useState } from "react";
import { createLazyFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { DragDropProvider } from "@dnd-kit/react";
import { Plus, Search, X } from "lucide-react";
import { CategorySidebar } from "~/components/category-nav/CategorySidebar";
import { SearchResults } from "~/components/search/results";
import { useTaskActions } from "~/components/task/use-actions";
import { Button } from "~/components/ui/button";
import { useCategories, useNotes, useTasks } from "~/lib/db/hooks";
import { addTask } from "~/lib/db/add-task";
import { useOptimisticUserId } from "~/lib/auth/current-user";
import { useActiveCategoryId } from "~/lib/state/active-category";
import { useCollaboratedCategoryIds } from "~/lib/hooks/use-collaborated-categories";
import { useIsDesk } from "~/lib/hooks/use-is-desk";
import { releaseKeyboard } from "~/lib/keyboard-bridge";
import { searchTasks } from "~/lib/search";
import type { Category } from "~/lib/types";

export const Route = createLazyFileRoute("/search")({
  component: SearchPage,
});

const bySortOrder = (a: Category, b: Category) =>
  (a.sortOrder ?? "").localeCompare(b.sortOrder ?? "");

// The layout keeps the query, so closing a task opened from the results lands back on them
function SearchPage() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isDesk = useIsDesk();
  const userId = useOptimisticUserId();
  const activeCategoryId = useActiveCategoryId();
  const { data: tasks = [] } = useTasks();
  const { data: notes = [] } = useNotes();
  const { data: rawCategories = [] } = useCategories();
  const collaboratedCategoryIds = useCollaboratedCategoryIds(userId);
  const { handleToggle } = useTaskActions();

  const categories = [...rawCategories].sort(bySortOrder);
  const results = searchTasks({
    query,
    tasks,
    notes,
    categories,
    userId,
    collaboratedCategoryIds,
  });

  // Search was opened from a list, which an added task goes into; one deleted since is the Inbox
  const fromList = categories.find((c) => c.id === activeCategoryId) ?? null;

  useEffect(() => {
    inputRef.current?.focus();
    releaseKeyboard();
  }, []);

  const q = query.trim();
  const searched = q.length >= 2;
  const found = results.groups.length > 0 || results.done.length > 0;
  const canAdd = searched && !results.exact && !results.corrected;

  const close = () => void navigate({ to: "/" });
  const add = async () => {
    await addTask(q, fromList?.id ?? null);
    void navigate({ to: "/" });
  };
  const addLabel = `Add “${q}” to ${fromList?.name ?? "Inbox"}`;

  return (
    <>
      {isDesk && (
        <DragDropProvider>
          <CategorySidebar reorderable={false} />
        </DragDropProvider>
      )}

      <search className="mb-3 flex shrink-0 items-center gap-2.5">
        <Search size={18} className="shrink-0 text-hint" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          aria-label="Search every list"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (e.key === "Enter" && searched && !found && canAdd) void add();
          }}
          enterKeyHint="search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-1 font-display text-[1.75rem] leading-tight text-foreground caret-primary outline-none placeholder:text-hint [&::-webkit-search-cancel-button]:hidden"
        />
        <Button
          variant="subtle"
          size="sm"
          icon
          onClick={close}
          aria-label="Close search"
          className="-mr-2 touch:size-11"
        >
          <X className="size-5" />
        </Button>
      </search>

      <div className="scroll-edge-fade touch:-mx-2 touch:flex touch:min-h-0 touch:flex-1 touch:flex-col touch:overflow-y-auto touch:px-2 touch:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        {!searched && <p className="text-sm text-hint">Every list, done tasks and notes.</p>}

        {searched && results.corrected && (
          <p className="mb-3 text-sm text-hint">
            Showing results for <span className="text-foreground">{results.corrected}</span>
          </p>
        )}

        {searched && found && (
          <SearchResults
            results={results}
            categories={categories}
            onOpen={(taskId) => navigate({ to: "/search/task/$taskId", params: { taskId } })}
            onToggle={handleToggle}
          />
        )}

        {searched && found && canAdd && (
          <Button
            variant="outline"
            onClick={add}
            className="mt-5 h-11 justify-start gap-2.5 self-start px-4 font-normal text-muted-foreground"
          >
            <Plus />
            {addLabel}
          </Button>
        )}

        {searched && !found && (
          <div className="flex flex-col items-center py-10 text-center touch:flex-1 touch:justify-center touch:pb-24">
            <p className="font-display text-2xl text-muted-foreground">Nothing matches.</p>
            <p className="mt-1 max-w-64 text-sm text-hint">
              No task, subtask or note on this device mentions “{q}”.
            </p>
            {canAdd && (
              <Button
                onClick={add}
                className="mt-6 h-11 gap-2 bg-primary-subtle px-5 text-primary hover:bg-primary-selected"
              >
                <Plus />
                {addLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      <Outlet />
    </>
  );
}
