import { useEffect, useEffectEvent, useState } from "react";
import { Toast } from "@base-ui/react/toast";
import {
  useTasks,
  useCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "~/lib/db/hooks";
import { useActiveCategoryId, setActiveCategoryId } from "~/lib/state/active-category";
import { useCurrentUserId, useOptimisticUserId } from "~/lib/auth/current-user";
import { useCollaboratedCategoryIds } from "~/lib/hooks/use-collaborated-categories";
import { leaveCategory } from "~/lib/actions";
import { countOpenTasksByCategory } from "~/lib/effective-category";
import type { CategoryTaskAction } from "~/lib/constants";
import type { Category } from "~/lib/types";
import type { PendingCategoryDelete } from "./DeleteCategoryDialog";

export const useCategoryActions = () => {
  const { data: rawCategories } = useCategories();
  const { data: allTasks } = useTasks();
  const activeCategoryId = useActiveCategoryId();
  const authUserId = useCurrentUserId();
  const currentUserId = useOptimisticUserId();
  const toastManager = Toast.useToastManager();
  const [pendingDelete, setPendingDelete] = useState<PendingCategoryDelete | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const categories = rawCategories
    ? [...rawCategories].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""))
    : [];

  const collaboratedCategoryIds = useCollaboratedCategoryIds(currentUserId);

  const openCounts = countOpenTasksByCategory(
    allTasks ?? [],
    currentUserId,
    collaboratedCategoryIds,
  );
  const inboxCount = openCounts.get(null) ?? 0;
  const showInbox = inboxCount > 0;

  // Auto-select first category when inbox empties
  const autoSelectFirst = useEffectEvent(() => {
    if (activeCategoryId === null && !showInbox && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  });

  useEffect(() => {
    autoSelectFirst();
  }, [showInbox]);

  const handleAdd = (name: string) => {
    const cat = addCategory({
      name,
      userId: currentUserId,
      color: null,
      sortOrder: null,
      user: null,
    });
    setActiveCategoryId(cat.id);
  };

  const handleRename = (id: string, name: string) => updateCategory(id, { name });

  const handleSetColor = (id: string, color: string | null) => updateCategory(id, { color });

  const deleteAndMoveOn = (cat: Category, tasks: CategoryTaskAction) => {
    deleteCategory(cat.id, tasks).isPersisted.promise.catch(() => {
      toastManager.add({ title: `Couldn't delete “${cat.name}”` });
    });
    const remaining = categories.filter((c) => c.id !== cat.id);
    setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);
  };

  const handleDelete = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    const categoryTasks = (allTasks ?? []).filter((t) => t.categoryId === id);
    if (categoryTasks.length > 0) {
      setPendingDelete({ category: cat, tasks: categoryTasks });
      setConfirmingDelete(true);
      return;
    }

    deleteAndMoveOn(cat, "uncategorise");
    toastManager.add({ title: "Category deleted" });
  };

  const confirmDelete = (tasks: CategoryTaskAction) => {
    setConfirmingDelete(false);
    if (!pendingDelete) return;
    deleteAndMoveOn(pendingDelete.category, tasks);
    toastManager.add({
      title:
        tasks === "delete" ? "Category and tasks deleted" : "Category deleted, tasks moved to Inbox",
    });
  };

  const handleLeave = async (categoryId: string) => {
    if (!authUserId) return;
    await leaveCategory(categoryId, authUserId);
    const remaining = categories.filter((c) => c.id !== categoryId);
    setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);
  };

  return {
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
    deleteDialog: {
      request: pendingDelete,
      open: confirmingDelete,
      onOpenChange: setConfirmingDelete,
      onConfirm: confirmDelete,
      currentUserId,
    },
  };
};
