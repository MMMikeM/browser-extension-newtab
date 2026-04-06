import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/react/sortable";
import { useDroppable } from "@dnd-kit/react";
import { ChevronDown, Ellipsis, Plus } from "lucide-react";
import { Drawer, DrawerContent } from "~/components/ui/drawer";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { CategoryCollabSheet } from "~/components/CategoryCollabSheet";
import { Input } from "~/components/ui/input";
import { CATEGORY_COLORS } from "~/lib/constants";
import { useNavContext } from "~/lib/state/nav-context";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";

// ─── Shared constant (re-exported so use-task-actions can import from here) ────

export const CATEGORY_DROP_PREFIX = "category-drop-";

// ─── Shared prop interface ──────────────────────────────────────────────────

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string | null;
  currentUserId: string | null;
  showInbox?: boolean;
  inboxCount?: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (id: string | null) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: string | null) => void;
  onDeleteCategory: (id: string) => void;
  onLeaveCategory: (id: string) => void;
}

// ─── useIsTouch: synchronous, no flash ─────────────────────────────────────

const useIsTouch = () =>
  useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  )[0];

// ─── Switcher ───────────────────────────────────────────────────────────────

export function CategoryNav(props: CategoryNavProps) {
  const isTouch = useIsTouch();
  if (isTouch) return <CategoryMobileSheet {...props} />;
  return <CategorySidebar {...props} />;
}

// ─── DnD wrappers (desktop only) ───────────────────────────────────────────

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

// ─── CategorySidebar (desktop) ──────────────────────────────────────────────

function CategorySidebar({
  categories,
  activeCategoryId,
  currentUserId,
  showInbox,
  onSelect,
  onAdd,
  onRename,
  onSetColor,
  onDeleteCategory,
  onLeaveCategory,
}: CategoryNavProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sharingCategoryId, setSharingCategoryId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const submitRename = () => {
    const name = renameValue.trim();
    if (name && renamingId) onRename(renamingId, name);
    setRenamingId(null);
  };

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
                  onClick={() => onSelect(cat.id)}
                  className={cn(
                    "flex flex-1 items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left min-w-0",
                    isActive ? "text-foreground" : "text-hint hover:text-foreground",
                    isDropTarget && "ring-1 ring-primary/30 rounded-md",
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full"
                      style={{
                        backgroundColor: cat.color ?? "oklch(0.60 0.18 118)",
                      }}
                    />
                  )}
                  {/* Color dot */}
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: cat.color ?? undefined,
                    }}
                  />
                  <span className="truncate flex-1">
                    {cat.name}
                    {!isOwned && cat.user?.name && (
                      <span className="ml-1 text-xs font-normal text-ghost">
                        · {cat.user.name.split(" ")[0]}
                      </span>
                    )}
                  </span>
                </button>

                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        className="mr-1 rounded p-0.5 text-transparent opacity-0 transition-opacity group-hover/pill:opacity-100 group-hover/pill:text-hint hover:text-foreground"
                        aria-label="Category options"
                      />
                    }
                  >
                    <Ellipsis size={13} />
                  </PopoverTrigger>
                  <PopoverContent>
                    {isOwned ? (
                      <>
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                          onClick={() => {
                            setRenamingId(cat.id);
                            setRenameValue(cat.name);
                          }}
                        >
                          Rename
                        </button>
                        <div className="px-2 py-1.5">
                          <span className="text-xs text-muted-foreground">Color</span>
                          <div className="mt-1 grid grid-cols-4 gap-1">
                            {CATEGORY_COLORS.map((c) => (
                              <button
                                key={c.name}
                                onClick={() => onSetColor(cat.id, c.value)}
                                className="size-6 rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110"
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                              />
                            ))}
                          </div>
                          <button
                            className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => onSetColor(cat.id, null)}
                          >
                            None
                          </button>
                        </div>
                        <div className="my-1 h-px bg-border" />
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                          onClick={() => setSharingCategoryId(cat.id)}
                        >
                          Share
                        </button>
                        <button
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteCategory(cat.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => onLeaveCategory(cat.id)}
                      >
                        Leave
                      </button>
                    )}
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
        className="touch:hidden fixed top-0 flex flex-col w-40 h-screen py-8 overflow-y-auto"
        style={{ left: "calc(50vw - 22.5rem)" }}
      >
        {/* Inbox — conditional */}
        {showInbox && (
          <button
            onClick={() => onSelect(null)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
              activeCategoryId === null ? "text-foreground" : "text-hint hover:text-foreground",
            )}
          >
            {activeCategoryId === null && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full bg-primary" />
            )}
            <span className="size-1.5 shrink-0 rounded-full bg-ghost" />
            Inbox
          </button>
        )}

        {/* Owned categories */}
        {ownedCategories.map((cat, index) => renderPill(cat, index))}

        {/* Add category */}
        {adding ? (
          <form
            className="px-3 py-1"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              onAdd(name);
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
          <button
            onClick={() => setAdding(true)}
            aria-label="Add category"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-hint hover:text-foreground transition-colors"
          >
            <Plus size={11} />
            <span>Add</span>
          </button>
        )}

        {/* Shared categories */}
        {sharedCategories.length > 0 && (
          <>
            <div className="my-2 border-t border-ghost/15" />
            {sharedCategories.map((cat, index) =>
              renderPill(cat, ownedCategories.length + index),
            )}
          </>
        )}

        {/* Spacer + People link */}
        <div className="flex-1" />
        <div className="border-t border-ghost/15 mt-2 pt-2">
          <Link
            to="/people"
            className="flex items-center px-3 py-1.5 text-sm text-hint hover:text-foreground transition-colors"
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

// ─── CategoryMobileSheet (mobile) ───────────────────────────────────────────

function CategoryMobileSheet({
  categories,
  activeCategoryId,
  currentUserId,
  showInbox,
  inboxCount = 0,
  open,
  onOpenChange,
  onSelect,
  onAdd,
  onRename,
  onSetColor,
  onDeleteCategory,
  onLeaveCategory,
}: CategoryNavProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sharingCategoryId, setSharingCategoryId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const { setMobileNavContent } = useNavContext();

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && renamingId) onRename(renamingId, trimmed);
    setRenamingId(null);
  };

  const selectAndClose = (id: string | null) => {
    onSelect(id);
    onOpenChange(false);
  };

  const ownedCategories = categories.filter((c) => c.userId === currentUserId);
  const sharedCategories = categories.filter((c) => c.userId !== currentUserId);

  const activeCategory = activeCategoryId ? categories.find((c) => c.id === activeCategoryId) : null;
  const showBadge = inboxCount > 0 && activeCategoryId !== null;

  // Register the header trigger via context
  useLayoutEffect(() => {
    setMobileNavContent(
      <button
        data-testid="category-nav-trigger"
        onClick={() => onOpenChange(true)}
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
    onOpenChange,
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
            {isOwned ? (
              <>
                <button
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => {
                    setRenamingId(cat.id);
                    setRenameValue(cat.name);
                  }}
                >
                  Rename
                </button>
                <div className="px-2 py-1.5">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => onSetColor(cat.id, c.value)}
                        className="size-6 rounded-full ring-1 ring-foreground/10 transition-transform active:scale-95"
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <button
                    className="mt-1 text-xs text-muted-foreground"
                    onClick={() => onSetColor(cat.id, null)}
                  >
                    None
                  </button>
                </div>
                <div className="my-1 h-px bg-border" />
                <button
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setSharingCategoryId(cat.id)}
                >
                  Share
                </button>
                <button
                  className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => onDeleteCategory(cat.id)}
                >
                  Delete
                </button>
              </>
            ) : (
              <button
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => onLeaveCategory(cat.id)}
              >
                Leave
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          {/* Inbox */}
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

          {/* Owned categories */}
          {ownedCategories.map(renderRow)}

          {/* Shared categories */}
          {sharedCategories.length > 0 && (
            <>
              <div className="mx-5 my-1 h-px bg-border/50" />
              {sharedCategories.map(renderRow)}
            </>
          )}

          <div className="mx-5 mt-1 h-px bg-border/50" />

          {/* Add category */}
          {adding ? (
            <form
              className="px-5 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newName.trim();
                if (!name) return;
                onAdd(name);
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

          {/* People link */}
          <div className="mx-5 mt-1 h-px bg-border/50" />
          <Link
            to="/people"
            onClick={() => onOpenChange(false)}
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
