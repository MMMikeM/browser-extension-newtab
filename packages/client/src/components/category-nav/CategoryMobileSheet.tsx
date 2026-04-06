import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Ellipsis, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Drawer, DrawerContent } from "~/components/ui/drawer";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { CategoryCollabSheet } from "~/components/CategoryCollabSheet";
import { Input } from "~/components/ui/input";
import { setActiveCategoryId } from "~/lib/state/active-category";
import { useNavContext } from "~/lib/state/nav-context";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";
import { useCategoryNavState } from "./use-category-nav-state";
import { useCategoryActions } from "./use-category-actions";
import { CategoryOptionsContent } from "./CategoryOptionsContent";

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
  const { navOpen, setNavOpen, setMobileNavContent } = useNavContext();

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const selectAndClose = (id: string | null) => {
    setActiveCategoryId(id);
    setNavOpen(false);
  };

  const ownedCategories = categories.filter((c) => c.userId === currentUserId);
  const sharedCategories = categories.filter((c) => c.userId !== currentUserId);

  const activeCategory = activeCategoryId ? categories.find((c) => c.id === activeCategoryId) : null;
  const showBadge = inboxCount > 0 && activeCategoryId !== null;

  useLayoutEffect(() => {
    setMobileNavContent(
      <button
        data-testid="category-nav-trigger"
        onClick={() => setNavOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors active:text-hint"
      >
        {activeCategory?.color && (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: activeCategory.color }}
          />
        )}
        <span>{activeCategory?.name ?? "Inbox"}</span>
        <ChevronDown size={13} className="text-hint" />
        {showBadge && (
          <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
            {inboxCount > 9 ? "9+" : inboxCount}
          </span>
        )}
      </button>,
    );
    return () => setMobileNavContent(null);
  }, [
    activeCategory?.id,
    activeCategory?.name,
    activeCategory?.color,
    showBadge,
    inboxCount,
    setNavOpen,
    setMobileNavContent,
  ]);

  const renderRow = (cat: Category) => {
    const isOwned = cat.userId === currentUserId;
    const isActive = activeCategoryId === cat.id;

    if (renamingId === cat.id) {
      return (
        <form
          key={cat.id}
          className="px-5 py-2"
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
            className="h-8 text-sm"
            onBlur={submitRename}
          />
        </form>
      );
    }

    return (
      <div key={cat.id} className="flex items-center">
        <button
          onClick={() => selectAndClose(cat.id)}
          className={cn(
            "flex flex-1 items-center gap-3 px-5 py-3.5 text-sm transition-colors",
            isActive ? "font-medium text-foreground" : "text-hint",
          )}
        >
          {cat.color ? (
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
          ) : (
            <span className={cn("size-2 shrink-0 rounded-full", isActive ? "bg-primary" : "bg-transparent")} />
          )}
          <span className="flex-1 text-left">
            {cat.name}
            {!isOwned && cat.user?.name && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                · {cat.user.name}
              </span>
            )}
          </span>
        </button>

        <Popover>
          <PopoverTrigger
            render={
              <button
                className="mr-3 rounded p-2 text-hint transition-colors active:text-foreground"
                aria-label="Category options"
              />
            }
          >
            <Ellipsis size={14} />
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
    );
  };

  return (
    <>
      <Drawer open={navOpen} onOpenChange={setNavOpen}>
        <DrawerContent>
          {showInbox && (
            <button
              onClick={() => selectAndClose(null)}
              className={cn(
                "flex w-full items-center gap-3 px-5 py-3.5 text-sm transition-colors",
                activeCategoryId === null ? "font-medium text-foreground" : "text-hint",
              )}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  activeCategoryId === null ? "bg-primary" : "bg-transparent",
                )}
              />
              Inbox
              {inboxCount > 0 && activeCategoryId !== null && (
                <span className="ml-auto text-xs text-primary">{inboxCount}</span>
              )}
            </button>
          )}

          <div className="mx-5 h-px bg-border/50" />

          {ownedCategories.map(renderRow)}

          {sharedCategories.length > 0 && (
            <>
              <div className="mx-5 my-1 h-px bg-border/50" />
              {sharedCategories.map(renderRow)}
            </>
          )}

          <div className="mx-5 mt-1 h-px bg-border/50" />

          {adding ? (
            <form
              className="px-5 py-3"
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name..."
                className="h-8 text-sm"
                onBlur={() => {
                  if (!newName.trim()) setAdding(false);
                }}
              />
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-hint transition-colors active:text-foreground"
            >
              <Plus size={14} />
              Add category
            </button>
          )}

          <div className="mx-5 mt-1 h-px bg-border/50" />
          <Link
            to="/people"
            onClick={() => setNavOpen(false)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-sm text-hint transition-colors active:text-foreground"
          >
            People
          </Link>

          <div className="h-[env(safe-area-inset-bottom,12px)] min-h-3" />
        </DrawerContent>
      </Drawer>

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
