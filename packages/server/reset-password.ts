import { hash } from "@node-rs/argon2";
import { createClient } from "@libsql/client";
import { now } from "@newtab-todo/shared/iso";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

const [userId, password] = process.argv.slice(2);

if (!userId || !password) {
  console.error("Usage: node reset-password.ts <user-id> <new-password>");
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const passwordHash = await hash(password, ARGON2_OPTIONS);

const result = await client.execute({
  sql: "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
  args: [passwordHash, now(), userId],
});

if (result.rowsAffected === 0) {
  console.error(`No user found with id: ${userId}`);
  process.exit(1);
}

console.log(`Password reset for user: ${userId}`);
await client.close();
