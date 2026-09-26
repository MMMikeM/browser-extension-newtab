import { Button } from "~/components/ui/button";
import { PopoverClose } from "~/components/ui/popover";
import { CATEGORY_COLORS } from "~/lib/constants";
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
        className="w-full justify-start rounded-sm touch:h-10"
        onClick={() => onLeave(cat.id)}
      >
        Leave
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start rounded-sm touch:h-10"
        onClick={() => onRenameStart(cat.id, cat.name)}
      >
        Rename
      </Button>
      <div className="px-2 py-1.5">
        <span className="text-xs text-hint">Colour</span>
        <div className="mt-1 grid grid-cols-4 gap-1 touch:gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => onSetColor(cat.id, c.value)}
              className="size-6 rounded-full ring-1 ring-foreground/10 transition-transform hover:scale-110 active:scale-95 touch:size-8"
              style={{ backgroundColor: c.value }}
              title={c.name}
              aria-label={`Colour ${c.name}`}
            />
          ))}
        </div>
      </div>
      <div className="my-1 h-px bg-border" />
      {/* Close explicitly: unlike Rename/Delete, sharing leaves the row mounted,
          so the popover would otherwise stay open behind the share sheet */}
      <PopoverClose
        render={
          <Button
            data-testid="category-share-btn"
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-sm touch:h-10"
          />
        }
        onClick={() => onShare(cat.id)}
      >
        Share
      </PopoverClose>
      <Button
        variant="ghost"
        intent="destructive"
        size="sm"
        className="w-full justify-start rounded-sm touch:h-10"
        onClick={() => onDelete(cat.id)}
      >
        Delete
      </Button>
    </>
  );
}
