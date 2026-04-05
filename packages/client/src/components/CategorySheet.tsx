import { useEffect, useRef, useState } from "react";
import { ChevronDown, Ellipsis, Plus } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent } from "~/components/ui/drawer";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Input } from "~/components/ui/input";
import { CATEGORY_COLORS } from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";

export function CategorySheet({
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
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

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
    setOpen(false);
  };

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        data-testid="category-sheet-trigger"
        render={
          <button className="flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-foreground transition-colors active:bg-accent/10" />
        }
      >
        {activeCategory?.color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: activeCategory.color }}
          />
        )}
        <span>{activeCategory?.name ?? "Inbox"}</span>
        <ChevronDown size={13} className="text-hint" />
      </DrawerTrigger>

      <DrawerContent>
        {/* Inbox */}
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
        </button>

        <div className="mx-5 h-px bg-border/50" />

        {/* Category list */}
        {categories.map((cat) => {
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
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                ) : (
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      isActive ? "bg-primary" : "bg-transparent",
                    )}
                  />
                )}
                {cat.name}
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
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteCategory(cat.id)}
                  >
                    Delete
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          );
        })}

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

        <div className="h-[env(safe-area-inset-bottom,12px)] min-h-3" />
      </DrawerContent>
    </Drawer>
  );
}
