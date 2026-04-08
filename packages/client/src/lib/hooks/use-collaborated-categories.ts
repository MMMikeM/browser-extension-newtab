import { useCategories } from "~/lib/db/hooks";

/** Returns a Set of category IDs where the given user is a collaborator (not owner). */
export const useCollaboratedCategoryIds = (userId: string | null) => {
  const { data: rawCategories } = useCategories();
  return new Set(
    (rawCategories ?? [])
      .filter((c) => c.collaborators?.some((col) => col.user?.id === userId))
      .map((c) => c.id),
  );
};
