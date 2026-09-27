import { and, eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-orm/zod";
import { createId } from "@paralleldrive/cuid2";
import { db, inTransaction } from "./client";
import { contacts } from "./schema";
import { NotFoundError } from "./errors";
import { userPublicSchema } from "./user.repo";

export const contactResponseSchema = createSelectSchema(contacts).extend({
  contactUser: userPublicSchema.nullable(),
});

const list = async (userId: string) =>
  db.query.contacts.findMany({
    where: { userId },
    with: {
      contactUser: { columns: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

export type ContactWithUser = Awaited<ReturnType<typeof list>>[number];

const insert = async (userId: string, contactUserId: string) => {
  const [row] = await db
    .insert(contacts)
    .values({ id: createId(), userId, contactUserId })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
};

const exists = async (userId: string, contactUserId: string): Promise<boolean> => {
  const row = await db.query.contacts.findFirst({
    where: { userId, contactUserId },
    columns: { id: true },
  });
  return !!row;
};

// One transaction: deleting only one direction would leave one user still seeing the other
const remove = async (id: string, userId: string) => {
  const contact = await db.query.contacts.findFirst({ where: { id, userId } });
  if (!contact) throw new NotFoundError("contact", id);

  await inTransaction(async (tx) => {
    await tx
      .delete(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.contactUserId, contact.contactUserId)));
    await tx
      .delete(contacts)
      .where(and(eq(contacts.userId, contact.contactUserId), eq(contacts.contactUserId, userId)));
  });

  return contact;
};

export default { list, insert, exists, remove };
