import { useCategories } from "~/lib/db/hooks";

/** Excludes categories the user owns. */
export const useCollaboratedCategoryIds = (userId: string | null) => {
  const { data: rawCategories } = useCategories();
  return new Set(
    (rawCategories ?? [])
      .filter((c) => c.collaborators?.some((col) => col.user?.id === userId))
      .map((c) => c.id),
  );
};
