import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import type { CategoryTaskAction } from "~/lib/constants";
import type { Category, Task } from "~/lib/types";

export interface PendingCategoryDelete {
  category: Category;
  tasks: Task[];
}

interface DeleteCategoryDialogProps {
  // Kept after closing, so the text doesn't blank out during the exit animation
  request: PendingCategoryDelete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tasks: CategoryTaskAction) => void;
  currentUserId: string;
}

const countOf = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export function DeleteCategoryDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  currentUserId,
}: DeleteCategoryDialogProps) {
  if (!request) return null;
  const othersCount = request.tasks.filter((t) => t.userId !== currentUserId).length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="delete-category-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{request.category.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            It has {countOf(request.tasks.length, "task")}
            {othersCount > 0 && `, including ${othersCount} added by others`}. Move them to
            Inbox, or delete them {othersCount > 0 ? "for everyone" : "too"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="ghost" intent="destructive" onClick={() => onConfirm("delete")}>
            Delete tasks
          </Button>
          <Button
            variant="ghost"
            onClick={() => onConfirm("uncategorise")}
            className="bg-primary-subtle text-primary hover:bg-primary-selected hover:text-primary"
          >
            Move to Inbox
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
