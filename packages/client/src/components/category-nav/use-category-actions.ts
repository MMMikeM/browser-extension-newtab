import { useEffect, useRef } from "react";
import { Toast } from "@base-ui/react/toast";
import {
  useTasks,
  useCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  updateTask,
} from "~/lib/db/hooks";
import { tasksCollection, categoriesCollection } from "~/lib/db/collections";
import { useActiveCategoryId, setActiveCategoryId } from "~/lib/state/active-category";
import { useCurrentUserId, useOptimisticUserId } from "~/lib/auth/current-user";
import { useCollaboratedCategoryIds } from "~/lib/hooks/use-collaborated-categories";
import { leaveCategory } from "~/lib/actions";

export const useCategoryActions = () => {
  const { data: rawCategories } = useCategories();
  const { data: allTasks } = useTasks();
  const activeCategoryId = useActiveCategoryId();
  const authUserId = useCurrentUserId();
  const currentUserId = useOptimisticUserId();
  const toastManager = Toast.useToastManager();
  const undoIdRef = useRef<string | undefined>(undefined);

  const categories = rawCategories
    ? [...rawCategories].sort((a, b) => (a.sortOrder ?? "").localeCompare(b.sortOrder ?? ""))
    : [];

  const collaboratedCategoryIds = useCollaboratedCategoryIds(currentUserId);

  const inboxTasks = (allTasks ?? []).filter((t) => {
    if (t.parentId) return false;
    if (t.status === "done") return false;

    const isOwner = t.userId === currentUserId;
    if (isOwner) return !t.categoryId;

    // Task is in a category we collaborate on — it belongs there, not inbox
    if (t.categoryId && collaboratedCategoryIds.has(t.categoryId)) return false;

    const myShare = t.shares.find((s) => s.sharedWithUserId === currentUserId);
    return myShare ? !myShare.categoryId : false;
  });
  const showInbox = inboxTasks.length > 0;
  const inboxCount = inboxTasks.length;

  // Auto-select first category when inbox empties
  useEffect(() => {
    if (activeCategoryId === null && !showInbox && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [showInbox]);

  const pushUndo = (message: string, onUndo: () => void) => {
    undoIdRef.current = toastManager.add({ title: message, timeout: 5000, data: { onUndo } });
  };

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

  const handleDelete = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    const affectedTaskIds = [...(tasksCollection.state?.values() ?? [])]
      .filter((t) => t.categoryId === id)
      .map((t) => t.id);

    for (const tid of affectedTaskIds) {
      updateTask(tid, { categoryId: null });
    }
    deleteCategory(id);
    const remaining = categories.filter((c) => c.id !== id);
    setActiveCategoryId(remaining.length > 0 ? remaining[0].id : null);

    if (cat) {
      pushUndo("Category deleted", () => {
        categoriesCollection.insert(cat);
        for (const tid of affectedTaskIds) {
          updateTask(tid, { categoryId: id });
        }
        setActiveCategoryId(id);
      });
    }
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
    handleAdd,
    handleRename,
    handleSetColor,
    handleDelete,
    handleLeave,
  };
};
