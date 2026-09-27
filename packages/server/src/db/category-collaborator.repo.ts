import { and, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "./client";
import { categories, categoryCollaborators } from "./schema";
import { NotFoundError } from "./errors";

const add = async (categoryId: string, userId: string) => {
  const [row] = await db
    .insert(categoryCollaborators)
    .values({ id: createId(), categoryId, userId })
    .onConflictDoNothing()
    .returning();
  return row;
};

const remove = async (categoryId: string, userId: string) => {
  const [row] = await db
    .delete(categoryCollaborators)
    .where(
      and(
        eq(categoryCollaborators.categoryId, categoryId),
        eq(categoryCollaborators.userId, userId),
      ),
    )
    .returning();
  if (!row) throw new NotFoundError("category collaborator");
  return row;
};

const removeAllBetweenUsers = async (userAId: string, userBId: string) => {
  const aCategoryIds = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userAId));
  const bCategoryIds = db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userBId));

  await Promise.all([
    db
      .delete(categoryCollaborators)
      .where(
        and(
          eq(categoryCollaborators.userId, userBId),
          inArray(categoryCollaborators.categoryId, aCategoryIds),
        ),
      ),
    db
      .delete(categoryCollaborators)
      .where(
        and(
          eq(categoryCollaborators.userId, userAId),
          inArray(categoryCollaborators.categoryId, bCategoryIds),
        ),
      ),
  ]);
};

const listUserIds = async (categoryId: string): Promise<string[]> => {
  const rows = await db.query.categoryCollaborators.findMany({
    where: { categoryId },
    columns: { userId: true },
  });
  return rows.map((r) => r.userId);
};

export default { add, remove, removeAllBetweenUsers, listUserIds };
