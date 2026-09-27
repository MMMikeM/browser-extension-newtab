import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ellipsis, Plus, Users } from "lucide-react";
import { INBOX_COLOR } from "~/lib/constants";
import { Drawer, DrawerContent, DrawerTitle } from "~/components/ui/drawer";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { CategoryCollabSheet } from "~/components/CategoryCollabSheet";
import { CollabBadge } from "./CollabBadge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/field";
import { ColorDot } from "~/components/ui/color-dot";
import { setActiveCategoryId } from "~/lib/state/active-category";
import { useNavContext } from "~/lib/state/nav-context";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";
import { useCategoryNavState } from "./use-category-nav-state";
import { useCategoryActions } from "./use-category-actions";
import { CategoryOptionsContent } from "./CategoryOptionsContent";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import { SharedWithMeGroup } from "./SharedWithMeGroup";

const rowClass = (isActive: boolean) =>
  cn(
    "mx-2 flex items-center rounded-lg text-sm transition-colors",
    // primary-selected: the app's "chosen" surface (same as selected TogglePills)
    isActive ? "bg-primary-selected font-medium text-foreground" : "text-hint active:bg-muted",
  );

const OpenCount = ({ count }: { count: number }) =>
  count > 0 ? (
    <span className="text-xs text-hint tabular-nums">
      {count}
      <span className="sr-only"> open</span>
    </span>
  ) : null;

export function CategoryMobileSheet() {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
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
  const { navOpen, setNavOpen } = useNavContext();

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const selectAndClose = (id: string | null) => {
    setActiveCategoryId(id);
    setNavOpen(false);
  };

  const ownedCategories = categories.filter((c) => c.userId === currentUserId);
  const sharedCategories = categories.filter((c) => c.userId !== currentUserId);

  const renderRow = (cat: Category) => {
    const isOwned = cat.userId === currentUserId;
    const isActive = activeCategoryId === cat.id;

    if (renamingId === cat.id) {
      return (
        <form
          key={cat.id}
          className="px-5 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            submitRename();
          }}
        >
          <Input
            ref={renameRef}
            type="text"
            aria-label="Category name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
          />
        </form>
      );
    }

    return (
      <div key={cat.id} className={rowClass(isActive)}>
        <button
          onClick={() => selectAndClose(cat.id)}
          aria-current={isActive ? "true" : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left"
        >
          <ColorDot color={cat.color ?? undefined} />
          <span className="min-w-0 flex-1 truncate">
            {cat.name}
            {!isOwned && cat.user?.name && (
              <span className="ml-1 text-xs font-normal text-hint">· {cat.user.name}</span>
            )}
          </span>
          {/* For someone else's list the suffix already names the owner */}
          {isOwned && <CollabBadge category={cat} currentUserId={currentUserId} />}
          <OpenCount count={openCounts.get(cat.id) ?? 0} />
        </button>

        <Popover>
          <PopoverTrigger
            render={
              <button
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-hint transition-colors active:bg-secondary active:text-foreground"
                aria-label="Category options"
              />
            }
          >
            <Ellipsis size={16} />
          </PopoverTrigger>
          {/* backdrop: dismissing the menu must not also select the row underneath */}
          <PopoverContent backdrop aria-label={`${cat.name} options`}>
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
    );
  };

  return (
    <>
      <Drawer open={navOpen} onOpenChange={setNavOpen}>
        <DrawerContent>
          <DrawerTitle className="px-5 pt-3 pb-2 text-xs font-medium tracking-wide text-hint uppercase">
            Categories
          </DrawerTitle>

          {showInbox && (
            <div className={rowClass(activeCategoryId === null)}>
              <button
                onClick={() => selectAndClose(null)}
                aria-current={activeCategoryId === null ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left"
              >
                <ColorDot color={INBOX_COLOR} />
                <span className="flex-1">Inbox</span>
                <OpenCount count={inboxCount} />
              </button>
              {/* Spacer matching the options button so counts line up */}
              <span className="w-11 shrink-0" aria-hidden="true" />
            </div>
          )}

          {ownedCategories.map(renderRow)}

          {sharedCategories.length > 0 && (
            <SharedWithMeGroup headingClassName="px-5 pt-5 pb-2">
              {sharedCategories.map(renderRow)}
            </SharedWithMeGroup>
          )}

          <div className="mx-5 my-2 h-px bg-border" />

          {adding ? (
            <form
              className="px-5 py-1"
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
                ref={addRef}
                type="text"
                aria-label="New category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name..."
                enterKeyHint="done"
                onBlur={() => {
                  if (!newName.trim()) setAdding(false);
                }}
              />
            </form>
          ) : (
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setAdding(true)}
              className="mx-2 h-12 w-[calc(100%-1rem)] justify-start gap-3 rounded-lg px-3 active:bg-secondary active:text-foreground"
            >
              <Plus size={16} />
              Add category
            </Button>
          )}

          <Link
            to="/people"
            onClick={() => setNavOpen(false)}
            className="mx-2 flex h-12 items-center gap-3 rounded-lg px-3 text-sm text-hint transition-colors active:bg-secondary active:text-foreground"
          >
            <Users size={16} />
            People
          </Link>

          <div className="h-[max(0.75rem,env(safe-area-inset-bottom,0px))]" />
        </DrawerContent>
      </Drawer>

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

export default CategoryMobileSheet;
