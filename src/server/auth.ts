import sessionRepo from "./db/session.repo";

/**
 * Extract auth token from cookie or Authorization header.
 * Cookie takes priority (httpOnly, set by login/signup server functions).
 * Falls back to Bearer token (extension context).
 */
export const extractToken = (request: Request, url?: URL): string | null => {
  const cookie = request.headers.get("cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
    if (match) return match[1];
  }
  const header = request.headers.get("authorization");
  if (header) return header.replace(/^Bearer\s+/i, "");
  if (url) {
    const param = url.searchParams.get("token");
    if (param) return param;
  }
  return null;
};

/**
 * Validate a session token. Returns the userId if valid, throws otherwise.
 */
export const validateSession = async (token: string): Promise<string> => {
  const session = await sessionRepo.findValid(token);
  if (!session) throw new Error("Unauthorized");
  return session.userId;
};
