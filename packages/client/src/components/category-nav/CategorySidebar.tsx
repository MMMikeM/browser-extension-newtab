import { useState, type ReactNode, type RefCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/react/sortable";
import { useDroppable } from "@dnd-kit/react";
import { Ellipsis, Plus } from "lucide-react";
import { INBOX_COLOR } from "~/lib/constants";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { CategoryCollabSheet } from "~/components/CategoryCollabSheet";
import { CollabBadge } from "./CollabBadge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/field";
import { ColorDot } from "~/components/ui/color-dot";
import { setActiveCategoryId } from "~/lib/state/active-category";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";
import { useCategoryNavState } from "./use-category-nav-state";
import { useCategoryActions } from "./use-category-actions";
import { CategoryOptionsContent } from "./CategoryOptionsContent";

export const CATEGORY_DROP_PREFIX = "category-drop-";

const OpenCount = ({ count }: { count: number }) =>
  count > 0 ? (
    <span className="text-xs text-hint tabular-nums">
      {count}
      <span className="sr-only"> open</span>
    </span>
  ) : null;

// ─── DnD wrappers ──────────────────────────────────────────────────────────

function SortablePill({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: (ref: RefCallback<HTMLElement>) => ReactNode;
}) {
  const { ref } = useSortable({ id, index, type: "category" });
  return <>{children(ref)}</>;
}

function DroppablePill({
  categoryId,
  activeCategoryId,
  children,
}: {
  categoryId: string;
  activeCategoryId: string | null;
  children: (ref: RefCallback<HTMLElement>, isDropTarget: boolean) => ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `${CATEGORY_DROP_PREFIX}${categoryId}`,
    accept: "task",
    disabled: categoryId === activeCategoryId,
  });
  return <>{children(ref, isDropTarget)}</>;
}

// ─── CategorySidebar ────────────────────────────────────────────────────────

export function CategorySidebar() {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const {
    categories,
    activeCategoryId,
    currentUserId,
    showInbox,
    inboxCount,
    openCounts,
    handleAdd,
    handleRename,
    handleSetColor,
    handleDelete,
    handleLeave,
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

  const ownedCategories = categories.filter((c) => c.userId === currentUserId);
  const sharedCategories = categories.filter((c) => c.userId !== currentUserId);

  const renderPill = (cat: Category, index: number) => {
    const isOwned = cat.userId === currentUserId;
    const isActive = activeCategoryId === cat.id;

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
      <SortablePill key={cat.id} id={cat.id} index={index}>
        {(sortableRef) => (
          <DroppablePill categoryId={cat.id} activeCategoryId={activeCategoryId}>
            {(droppableRef, isDropTarget) => (
              <div className="group/pill relative flex items-center">
                <button
                  ref={(el) => {
                    sortableRef(el);
                    droppableRef(el);
                  }}
                  onClick={() => setActiveCategoryId(cat.id)}
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
                  <span className="flex-1 truncate">{cat.name}</span>
                  <OpenCount count={openCounts.get(cat.id) ?? 0} />
                </button>

                <CollabBadge category={cat} currentUserId={currentUserId} />

                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        className="flex h-5 w-0 shrink-0 items-center justify-center overflow-hidden rounded text-hint opacity-0 transition-opacity group-hover/pill:mr-1 group-hover/pill:w-5 group-hover/pill:opacity-100 hover:text-foreground focus-visible:mr-1 focus-visible:w-5 focus-visible:opacity-100 data-[popup-open]:mr-1 data-[popup-open]:w-5 data-[popup-open]:text-foreground data-[popup-open]:opacity-100"
                        aria-label="Category options"
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
      {/* On AppShell's sidebar surface; left tracks AppShell's desk:left-22 offset */}
      <nav
        aria-label="Lists"
        data-testid="category-sidebar"
        className="fixed top-0 left-[calc(50vw-17.5rem)] z-10 hidden h-screen w-44 flex-col overflow-y-auto py-8 pr-1 pl-3 desk:flex"
      >
        {showInbox && (
          <button
            onClick={() => setActiveCategoryId(null)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
              activeCategoryId === null ? "text-foreground" : "text-hint hover:text-foreground",
            )}
          >
            {activeCategoryId === null && (
              <span className="absolute top-1/2 left-0 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
            )}
            <ColorDot size="sm" color={INBOX_COLOR} />
            <span className="flex-1 text-left">Inbox</span>
            <OpenCount count={inboxCount} />
          </button>
        )}

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
            aria-label="Add category"
          >
            <span className="flex w-1.5 justify-center">
              <Plus className="size-2.5" />
            </span>
            <span>Add</span>
          </Button>
        )}

        {sharedCategories.length > 0 && (
          <>
            <div className="my-2 border-t border-ghost/15" />
            {sharedCategories.map((cat, index) => renderPill(cat, ownedCategories.length + index))}
          </>
        )}

        <div className="flex-1" />
        <div className="mt-2 border-t border-ghost/15 pt-2">
          <Link
            to="/people"
            className="flex items-center px-3 py-1.5 text-sm text-hint transition-colors hover:text-foreground"
          >
            People
          </Link>
        </div>
      </nav>

      {sharingCategoryId && (
        <CategoryCollabSheet
          categoryId={sharingCategoryId}
          open={!!sharingCategoryId}
          onClose={() => setSharingCategoryId(null)}
        />
      )}
    </>
  );
}
