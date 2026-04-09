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
                      style={{ backgroundColor: cat.color ?? "oklch(0.60 0.18 118)" }}
                    />
                  )}
                  <ColorDot size="sm" color={cat.color ?? undefined} />
                  <span className="flex-1 truncate">
                    {cat.name}
                    {!isOwned && cat.user?.name && (
                      <span className="ml-1 text-xs font-normal text-hint">
                        · {cat.user.name.split(" ")[0]}
                      </span>
                    )}
                  </span>
                </button>

                <CollabBadge category={cat} currentUserId={currentUserId} />

                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        className="mr-1 rounded p-0.5 text-transparent opacity-0 transition-opacity group-hover/pill:text-hint group-hover/pill:opacity-100 hover:text-foreground"
                        aria-label="Category options"
                      />
                    }
                  >
                    <Ellipsis size={13} />
                  </PopoverTrigger>
                  <PopoverContent>
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
      <aside
        data-testid="category-sidebar"
        className="fixed top-0 z-10 flex h-screen w-40 flex-col overflow-y-auto py-8 touch:hidden"
        style={{ left: "calc(50vw - 22.5rem)" }}
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
            Inbox
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
            className="gap-2 px-3"
            aria-label="Add category"
          >
            <Plus size={11} />
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
      </aside>

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
