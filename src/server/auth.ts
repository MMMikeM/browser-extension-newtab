import { timingSafeEqual } from "node:crypto";

export function validateToken(token: string): void {
  const expected = process.env.AUTH_TOKEN;
  if (!expected) throw new Error("AUTH_TOKEN not configured");
  if (!safeCompare(token, expected)) throw new Error("Unauthorized");
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
