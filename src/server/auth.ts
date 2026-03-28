import { timingSafeEqual } from "node:crypto";

/**
 * Extract auth token from cookie or Authorization header.
 * Cookie takes priority (httpOnly, set by /api/auth).
 * Falls back to Bearer token (extension context).
 */
export function extractToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
    if (match) return match[1];
  }
  const header = request.headers.get("authorization");
  if (header) return header.replace(/^Bearer\s+/i, "");
  return null;
}

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
