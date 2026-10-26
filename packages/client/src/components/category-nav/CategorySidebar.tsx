import { useEffect, useState, type ReactNode, type RefCallback } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/react/sortable";
import { useDroppable } from "@dnd-kit/react";
import { Ellipsis, Plus, Search } from "lucide-react";
import { INBOX_COLOR, CATEGORY_DROP_PREFIX } from "~/lib/constants";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { CategoryCollabSheet } from "~/components/CategoryCollabSheet";
import { CollabBadge } from "./CollabBadge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/field";
import { ColorDot } from "~/components/ui/color-dot";
import { setActiveCategoryId } from "~/lib/state/active-category";
import { useCurrentUserId } from "~/lib/auth/current-user";
import { isListPath } from "~/lib/list-path";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";
import { useCategoryNavState } from "./use-category-nav-state";
import { useCategoryActions } from "./use-category-actions";
import { CategoryOptionsContent } from "./CategoryOptionsContent";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import { SharedWithMeGroup } from "./SharedWithMeGroup";

// Fixed width even when empty, so counts line up down the sidebar
const OpenCount = ({ count, className }: { count: number; className?: string }) => (
  <span className={cn("ml-auto w-5 shrink-0 text-right text-xs text-hint tabular-nums", className)}>
    {count > 0 && (
      <>
        {count}
        <span className="sr-only"> open</span>
      </>
    )}
  </span>
);

function SortablePill({
  id,
  index,
  disabled,
  children,
}: {
  id: string;
  index: number;
  disabled: boolean;
  children: (ref: RefCallback<HTMLElement>) => ReactNode;
}) {
  const { ref } = useSortable({ id, index, type: "category", disabled });
  return <>{children(ref)}</>;
}

function DroppablePill({
  categoryId,
  activeCategoryId,
  disabled,
  children,
}: {
  categoryId: string;
  activeCategoryId: string | null;
  disabled: boolean;
  children: (ref: RefCallback<HTMLElement>, isDropTarget: boolean) => ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `${CATEGORY_DROP_PREFIX}${categoryId}`,
    accept: "task",
    disabled: disabled || categoryId === activeCategoryId,
  });
  return <>{children(ref, isDropTarget)}</>;
}

/**
 * `/` opens search, unless something is being typed: the capture input is focused on every new tab,
 * so it only counts once it holds text. Not over an open sheet, which has fields of its own.
 */
const useSearchShortcut = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      const field = target?.closest<HTMLInputElement>("input, textarea, [contenteditable='true']");
      if (field && !(field.id === "add-task-input" && !field.value)) return;
      if (document.querySelector('[data-slot="drawer-content"]')) return;
      e.preventDefault();
      void navigate({ to: "/search" });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate]);
};

// Outside the task list (People), lists can't be reordered: the drop handling lives with the list
export function CategorySidebar({ reorderable = true }: { reorderable?: boolean }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const {
    categories,
    activeCategoryId,
    currentUserId,
    inboxCount,
    openCounts,
    handleAdd,
    handleRename,
    handleSetColor,
    handleDelete,
    handleLeave,
    deleteDialog,
  } = useCategoryActions();
  const {
    renamingId,
    renameValue,
    setRenameValue,
    sharingCategoryId,
    setSharingCategoryId,
    submitRename,
    startRename,
    renameRef,
  } = useCategoryNavState(handleRename);

  const signedIn = useCurrentUserId() !== null;
  useSearchShortcut();

  const navigate = useNavigate();
  const onListPage = useRouterState({ select: (s) => isListPath(s.location.pathname) });
  const openList = (categoryId: string | null) => {
    setActiveCategoryId(categoryId);
    if (!onListPage) void navigate({ to: "/" });
  };

  const ownedCategories = categories.filter((c) => c.userId === currentUserId);
  const sharedCategories = categories.filter((c) => c.userId !== currentUserId);

  const renderPill = (cat: Category, index: number) => {
    const isOwned = cat.userId === currentUserId;
    const isActive = onListPage && activeCategoryId === cat.id;

    if (renamingId === cat.id) {
      return (
        <form
          key={cat.id}
          className="px-3 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            submitRename();
          }}
        >
          <Input
            ref={renameRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="h-7 text-xs"
            onBlur={submitRename}
          />
        </form>
      );
    }

    return (
      <SortablePill key={cat.id} id={cat.id} index={index} disabled={!reorderable}>
        {(sortableRef) => (
          <DroppablePill
            categoryId={cat.id}
            activeCategoryId={activeCategoryId}
            disabled={!reorderable}
          >
            {(droppableRef, isDropTarget) => (
              <div className="group/pill relative flex items-center">
                <button
                  ref={(el) => {
                    sortableRef(el);
                    droppableRef(el);
                  }}
                  onClick={() => openList(cat.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                    isActive ? "text-foreground" : "text-hint hover:text-foreground",
                    isDropTarget && "rounded-md ring-1 ring-primary/30",
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute top-1/2 left-0 h-3.5 w-0.5 -translate-y-1/2 rounded-full"
                      style={{ backgroundColor: cat.color ?? "var(--primary)" }}
                    />
                  )}
                  <ColorDot size="sm" color={cat.color ?? undefined} />
                  <span className="min-w-0 truncate" title={cat.name}>
                    {cat.name}
                  </span>
                  <CollabBadge category={cat} currentUserId={currentUserId} />
                  <OpenCount
                    count={openCounts.get(cat.id) ?? 0}
                    className="transition-opacity group-hover/pill:opacity-0 pill-popup-open:opacity-0 pill-options-focus-visible:opacity-0"
                  />
                </button>

                <Popover>
                  {/* Takes the count's place on hover, so the row doesn't reflow */}
                  <PopoverTrigger
                    render={
                      <button
                        data-slot="category-options"
                        className="pointer-events-none absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded text-hint opacity-0 transition-opacity group-hover/pill:pointer-events-auto group-hover/pill:opacity-100 hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 data-[popup-open]:pointer-events-auto data-[popup-open]:text-foreground data-[popup-open]:opacity-100"
                        aria-label="List options"
                      />
                    }
                  >
                    <Ellipsis size={13} />
                  </PopoverTrigger>
                  <PopoverContent aria-label={`${cat.name} options`}>
                    <CategoryOptionsContent
                      cat={cat}
                      isOwned={isOwned}
                      onRenameStart={startRename}
                      onSetColor={handleSetColor}
                      onShare={setSharingCategoryId}
                      onDelete={handleDelete}
                      onLeave={handleLeave}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </DroppablePill>
        )}
      </SortablePill>
    );
  };

  return (
    <>
      <nav
        aria-label="Lists"
        data-testid="category-sidebar"
        className="fixed top-(--sheet-inset) left-(--panel-left) z-10 hidden h-[calc(100dvh-2*var(--sheet-inset))] w-(--sidebar-w) flex-col overflow-y-auto py-8 pr-1 pl-3 desk:flex"
      >
        <Link
          to="/search"
          className="group/search mb-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-hint transition-colors hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span>Search</span>
          <kbd className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] border border-ghost px-1 font-sans text-xs text-hint group-data-[status=active]/search:hidden">
            <span className="sr-only">Shortcut: </span>/
          </kbd>
        </Link>

        <button
          onClick={() => openList(null)}
          className={cn(
            "relative flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
            onListPage && activeCategoryId === null
              ? "text-foreground"
              : "text-hint hover:text-foreground",
          )}
        >
          {onListPage && activeCategoryId === null && (
            <span className="absolute top-1/2 left-0 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
          )}
          <ColorDot size="sm" color={INBOX_COLOR} />
          <span className="text-left">Inbox</span>
          <OpenCount count={inboxCount} />
        </button>

        {ownedCategories.map((cat, index) => renderPill(cat, index))}

        {adding ? (
          <form
            className="px-3 py-1"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              handleAdd(name);
              setNewName("");
              setAdding(false);
            }}
          >
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name..."
              className="h-7 text-xs"
              // eslint-disable-next-line jsx-a11y/no-autofocus -- inline add form, user just clicked Add
              autoFocus
              onBlur={() => {
                if (!newName.trim()) setAdding(false);
              }}
            />
          </form>
        ) : (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setAdding(true)}
            className="h-auto justify-start gap-2 px-3 py-1.5"
            aria-label="Add list"
          >
            <span className="flex w-1.5 justify-center">
              <Plus className="size-2.5" />
            </span>
            <span>Add</span>
          </Button>
        )}

        {sharedCategories.length > 0 && (
          <SharedWithMeGroup headingClassName="mt-5 mb-1 px-3">
            {sharedCategories.map((cat, index) => renderPill(cat, ownedCategories.length + index))}
          </SharedWithMeGroup>
        )}

        <div className="flex-1" />
        {signedIn && (
          <div className="mt-2 border-t border-ghost/15 pt-2">
            <Link
              to="/people"
              className="flex items-center px-3 py-1.5 text-sm text-hint transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              People
            </Link>
          </div>
        )}
      </nav>

      {sharingCategoryId && (
        <CategoryCollabSheet
          categoryId={sharingCategoryId}
          open={!!sharingCategoryId}
          onClose={() => setSharingCategoryId(null)}
        />
      )}
      <DeleteCategoryDialog {...deleteDialog} />
    </>
  );
}
