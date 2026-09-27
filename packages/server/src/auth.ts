import { HTTPException } from "hono/http-exception";
import sessionRepo from "./db/session.repo";

/**
 * The httpOnly cookie set at login/signup wins. The extension sends a Bearer header instead,
 * and EventSource, which can't set headers, passes the token as a query param.
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

export const validateSession = async (token: string): Promise<string> => {
  const session = await sessionRepo.findValid(token);
  if (!session) throw new HTTPException(401, { message: "Unauthorized" });
  return session.userId;
};
