import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { now } from "@newtab-todo/shared/iso";
import { db } from "./client";
import { contacts, inviteTokens } from "./schema";
import { InsertFailedError } from "./errors";

const create = async (createdByUserId: string, expiresAt: string) => {
  const id = createId();
  const [row] = await db
    .insert(inviteTokens)
    .values({ id, createdByUserId, expiresAt })
    .returning();
  if (!row) throw new InsertFailedError("invite token");
  return row;
};

const findById = async (token: string) => db.query.inviteTokens.findFirst({ where: { id: token } });

const findValid = async (token: string) =>
  db.query.inviteTokens.findFirst({
    where: {
      id: token,
      usedAt: { isNull: true },
      expiresAt: { gt: now() },
    },
  });

type InviteToken = NonNullable<Awaited<ReturnType<typeof findValid>>>;

// Marks the token as used and creates both-direction contact rows atomically.
// If contact creation fails, the token remains unused so the user can retry.
// Caller must pass the already-validated invite (from findValid) to avoid a second lookup.
const consume = async (invite: InviteToken, usedByUserId: string) => {
  await db.transaction(async (tx) => {
    await tx
      .update(inviteTokens)
      .set({ usedAt: now(), usedByUserId })
      .where(eq(inviteTokens.id, invite.id));

    // Insert both direction rows so each user can query contacts WHERE userId = me.
    // Uses tx (not global db) so both inserts are part of the same transaction.
    await tx
      .insert(contacts)
      .values([
        { id: createId(), userId: invite.createdByUserId, contactUserId: usedByUserId },
        { id: createId(), userId: usedByUserId, contactUserId: invite.createdByUserId },
      ])
      .onConflictDoNothing();
  });
};

export default { create, findById, findValid, consume };
