import { hash, verify } from "@node-rs/argon2";

export const MIN_PASSWORD_LENGTH = 8;

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export const hashPassword = (password: string) => hash(password, ARGON2_OPTIONS);

export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password);
