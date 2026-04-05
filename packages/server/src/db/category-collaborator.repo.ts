import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "./client";
import { categoryCollaborators } from "./schema";
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

export default { add, remove };
