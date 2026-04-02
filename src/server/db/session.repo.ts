import { randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "./client";
import { sessions } from "./schema";

const TOKEN_BYTES = 32;
const SESSION_TTL_DAYS = 90;

const generateToken = () => randomBytes(TOKEN_BYTES).toString("hex");

const expiresAt = () => {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date.toISOString();
};

const insert = async (userId: string) => {
  const id = generateToken();
  await db.insert(sessions).values({ id, userId, expiresAt: expiresAt() });
  return id;
};

const findValid = async (token: string) => {
  const now = new Date().toISOString();
  const [row] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
    .limit(1);
  return row ?? null;
};

const remove = async (token: string) => {
  await db.delete(sessions).where(eq(sessions.id, token));
};

const removeAllForUser = async (userId: string) => {
  await db.delete(sessions).where(eq(sessions.userId, userId));
};

export default { insert, findValid, remove, removeAllForUser };
