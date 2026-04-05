import { hash, verify } from "@node-rs/argon2";
import { HTTPException } from "hono/http-exception";
import { createId } from "@paralleldrive/cuid2";
import userRepo from "./db/user.repo";
import sessionRepo from "./db/session.repo";
import categoryRepo from "./db/category.repo";
import { ConflictError, NotFoundError } from "./db/errors";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

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

  const passwordHash = await hash(password, ARGON2_OPTIONS);
  const now = new Date().toISOString();
  const user = await userRepo.insert({
    id: createId(),
    name,
    username: normalizedUsername,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  await categoryRepo.insert({
    id: createId(),
    userId: user.id,
    name: "Personal",
    color: "oklch(0.60 0.18 118)",
    createdAt: now,
    updatedAt: now,
  });

  const token = await sessionRepo.insert(user.id);
  return { userId: user.id, token, name: user.name, username: user.username };
};

export const login = async (username: string, password: string) => {
  let user;
  try {
    user = await userRepo.findByUsernameWithPassword(username.toLowerCase());
  } catch {
    throw new HTTPException(401, { message: "Invalid username or password" });
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) throw new HTTPException(401, { message: "Invalid username or password" });

  const token = await sessionRepo.insert(user.id);
  return { userId: user.id, token, name: user.name, username: user.username };
};
