import { Check, LogOut, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PopoverClose } from "~/components/ui/popover";
import { CATEGORY_COLORS } from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { Category } from "~/lib/types";

interface CategoryOptionsContentProps {
  cat: Category;
  isOwned: boolean;
  onRenameStart: (id: string, name: string) => void;
  onSetColor: (id: string, color: string | null) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onLeave: (id: string) => void;
}

const itemClass = "w-full justify-start gap-2.5 rounded-md touch:h-11";

export function CategoryOptionsContent({
  cat,
  isOwned,
  onRenameStart,
  onSetColor,
  onShare,
  onDelete,
  onLeave,
}: CategoryOptionsContentProps) {
  if (!isOwned) {
    return (
      <Button
        variant="ghost"
        intent="destructive"
        size="sm"
        className={itemClass}
        onClick={() => onLeave(cat.id)}
      >
        <LogOut />
        Leave
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={itemClass}
        onClick={() => onRenameStart(cat.id, cat.name)}
      >
        <Pencil className="text-hint" />
        Rename
      </Button>
      <fieldset className="px-3 pt-1.5 pb-2">
        <legend className="float-left text-xs text-hint">Colour</legend>
        <div className="clear-left grid grid-cols-4 gap-1.5 pt-1.5 touch:gap-2">
          {CATEGORY_COLORS.map((c) => {
            const selected = cat.color === c.value;
            return (
              <button
                key={c.name}
                onClick={() => onSetColor(cat.id, c.value)}
                aria-label={`Colour ${c.name}`}
                aria-pressed={selected}
                title={c.name}
                className={cn(
                  // after: widens the touch target to 44px without crowding the grid
                  "relative flex size-6 items-center justify-center rounded-full ring-1 ring-foreground/10 transition-transform after:absolute after:-inset-1 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 motion-reduce:transition-none touch:size-9",
                  // A ring and a tick, so the chosen colour doesn't rely on hue alone
                  selected && "ring-2 ring-foreground/80 ring-offset-2 ring-offset-popover",
                )}
                style={{ backgroundColor: c.value }}
              >
                {selected && (
                  <Check className="size-3.5 text-background touch:size-4" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="my-1 h-px bg-border" />
      {/* Close explicitly: unlike Rename/Delete, sharing leaves the row mounted,
          so the popover would otherwise stay open behind the share sheet */}
      <PopoverClose
        render={
          <Button
            data-testid="category-share-btn"
            variant="ghost"
            size="sm"
            className={itemClass}
          />
        }
        onClick={() => onShare(cat.id)}
      >
        <UserPlus className="text-hint" />
        Share
      </PopoverClose>
      <Button
        variant="ghost"
        intent="destructive"
        size="sm"
        className={itemClass}
        onClick={() => onDelete(cat.id)}
      >
        <Trash2 />
        Delete
      </Button>
    </>
  );
}
