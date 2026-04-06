import { ChevronDown } from "lucide-react";
import { AddTaskInput } from "~/components/AddTaskInput";
import type { Category } from "~/lib/types";

interface Props {
  onAdd: (title: string) => void;
  activeCategory?: Category | null;
  onOpenNav?: () => void;
}

export function TaskInputBar({ onAdd, activeCategory, onOpenNav }: Props) {
  return (
    <div className="touch:order-2 touch:shrink-0 touch:-mx-6 touch:px-6 touch:border-t touch:border-border/20 touch:pt-3 touch:pb-[env(safe-area-inset-bottom,0px)]">
      {onOpenNav && (
        <button
          data-testid="category-input-chip"
          onClick={onOpenNav}
          className="hidden touch:flex items-center gap-1.5 mb-2 text-xs text-hint transition-colors active:text-foreground"
        >
          {activeCategory?.color && (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: activeCategory.color }}
            />
          )}
          <span>{activeCategory?.name ?? "Inbox"}</span>
          <ChevronDown size={10} className="opacity-50" />
        </button>
      )}
      <AddTaskInput onAdd={onAdd} />
    </div>
  );
}
