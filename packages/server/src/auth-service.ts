import { HTTPException } from "hono/http-exception";
import { createId } from "@paralleldrive/cuid2";
import { now } from "@newtab-todo/shared/iso";
import userRepo from "./db/user.repo";
import sessionRepo from "./db/session.repo";
import categoryRepo from "./db/category.repo";
import { ConflictError, NotFoundError } from "./db/errors";
import { hashPassword, verifyPassword } from "./password";

export const signup = async (username: string, password: string, name: string) => {
  const normalizedUsername = username.toLowerCase();
  let existing = false;
  try {
    await userRepo.findByUsername(normalizedUsername);
    existing = true;
  } catch (e) {
    if (!(e instanceof NotFoundError)) throw e;
  }
  if (existing) throw new ConflictError("Username already taken");

  const passwordHash = await hashPassword(password);
  const ts = now();
  const user = await userRepo.insert({
    id: createId(),
    name,
    username: normalizedUsername,
    passwordHash,
    createdAt: ts,
    updatedAt: ts,
  });

  await categoryRepo.insert({
    id: createId(),
    userId: user.id,
    name: "Personal",
    color: "oklch(0.60 0.18 118)",
    createdAt: ts,
    updatedAt: ts,
  });

  const token = await sessionRepo.insert(user.id);
  return { userId: user.id, token, name: user.name, username: user.username };
};

export const login = async (username: string, password: string) => {
  const normalized = username.toLowerCase();
  let user;
  try {
    user = await userRepo.findByUsernameWithPassword(normalized);
    console.log(`[login] found user id=${user.id} username=${user.username}`);
  } catch (e) {
    console.log(
      `[login] user not found username=${normalized} error=${e instanceof Error ? e.message : String(e)}`,
    );
    throw new HTTPException(401, { message: "Invalid username or password" });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  console.log(`[login] password valid=${valid} userId=${user.id}`);
  if (!valid) throw new HTTPException(401, { message: "Invalid username or password" });

  const token = await sessionRepo.insert(user.id);
  return { userId: user.id, token, name: user.name, username: user.username };
};
