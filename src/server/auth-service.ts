import { hash, verify } from "@node-rs/argon2";
import { createId } from "@paralleldrive/cuid2";
import userRepo from "./db/user.repo";
import sessionRepo from "./db/session.repo";
import { ConflictError, NotFoundError } from "./db/errors";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export const signup = async (username: string, password: string, name: string) => {
  let existing = false;
  try {
    await userRepo.findByUsername(username);
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
    username,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  const token = await sessionRepo.insert(user.id);
  return { userId: user.id, token, name: user.name, username: user.username };
};

export const login = async (username: string, password: string) => {
  let user;
  try {
    user = await userRepo.findByUsernameWithPassword(username);
  } catch {
    throw new Error("Invalid username or password");
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) throw new Error("Invalid username or password");

  const token = await sessionRepo.insert(user.id);
  return { userId: user.id, token, name: user.name, username: user.username };
};
