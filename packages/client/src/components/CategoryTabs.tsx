import { useEffect, useRef, useState, type ReactNode, type RefCallback } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useDroppable } from "@dnd-kit/react";
import { Input } from "~/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { CATEGORY_COLORS } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { Ellipsis, Plus } from "lucide-react";
import type { Category } from "~/lib/types";

export const CATEGORY_DROP_PREFIX = "category-drop-";

function SortableCategoryTab({
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

function DroppableCategoryTab({
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

export function CategoryTabs({
  categories,
  activeCategoryId,
  onSelect,
  onAdd,
  onRename,
  onSetColor,
  onDeleteCategory,
}: {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onSetColor: (id: string, color: string | null) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const submitRename = () => {
    const name = renameValue.trim();
    if (name && renamingId) onRename(renamingId, name);
    setRenamingId(null);
  };

  return (
    <div className="touch:hidden mb-1 flex flex-wrap items-end gap-0 border-b border-border">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 pb-1.5 pt-1 text-sm font-medium transition-colors touch:pb-3",
          activeCategoryId === null
            ? "-mb-px border-b-2 border-primary text-foreground"
            : "text-hint hover:text-foreground",
        )}
      >
        Inbox
      </button>
      {categories.map((cat, index) => {
        const isActive = activeCategoryId === cat.id;
        const color = cat.color ?? undefined;

        if (renamingId === cat.id) {
          return (
            <form
              key={cat.id}
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
                className="h-7 w-24 text-xs"
                onBlur={submitRename}
              />
            </form>
          );
        }

        return (
          <SortableCategoryTab key={cat.id} id={cat.id} index={index}>
            {(sortableRef) => (
              <DroppableCategoryTab categoryId={cat.id} activeCategoryId={activeCategoryId}>
                {(droppableRef, isDropTarget) => (
                  <div className="group/cattab flex items-center">
                    <button
                      ref={(el) => {
                        sortableRef(el);
                        droppableRef(el);
                      }}
                      onClick={() => onSelect(cat.id)}
                      className={cn(
                        "px-3 pb-1.5 pt-1 text-sm font-medium transition-colors touch:pb-3",
                        isActive
                          ? "-mb-px border-b-2 border-primary text-foreground"
                          : "text-hint hover:text-foreground",
                        isDropTarget &&
                          "ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md",
                      )}
                      style={isActive && color ? { borderBottomColor: color } : undefined}
                    >
                      {cat.name}
                    </button>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <button
                            className={cn(
                              "ml-0.5 rounded p-0.5 transition-opacity touch:p-2",
                              isActive
                                ? "text-transparent group-hover/cattab:text-hint hover:text-foreground touch:text-hint"
                                : "invisible",
                            )}
                            aria-label="Category options"
                          />
                        }
                      >
                        <Ellipsis size={14} />
                      </PopoverTrigger>
                      <PopoverContent>
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
                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteCategory(cat.id)}
                        >
                          Delete
                        </button>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </DroppableCategoryTab>
            )}
          </SortableCategoryTab>
        );
      })}
      {adding ? (
        <form
          className="flex items-center gap-1"
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
            className="h-7 w-24 text-xs"
            autoFocus
            onBlur={() => {
              if (!newName.trim()) setAdding(false);
            }}
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="ml-2 flex self-center items-center justify-center rounded-md border border-dashed border-ghost/50 p-1.5 text-hint transition-colors hover:border-muted-foreground hover:text-muted-foreground touch:p-3"
          aria-label="Add category"
        >
          <Plus size={13} />
        </button>
      )}
    </div>
  );
}
