import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import inviteTokenRepo from "../db/invite-token.repo";
import { authed } from "../middleware";
import { errorSchema, okSchema } from "./openapi-schemas";
import { jsonContent, withAuth } from "./crud";

const inviteResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});

export const inviteRoutes = authed()
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      responses: withAuth({ 200: jsonContent(inviteResponseSchema) }),
    }),
    async (c) => {
      const userId = c.get("userId");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const invite = await inviteTokenRepo.create(userId, expiresAt);
      return c.json({ token: invite.id, expiresAt: invite.expiresAt }, 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/:token/accept",
      responses: withAuth({
        200: jsonContent(okSchema),
        400: jsonContent(errorSchema, "Bad request"),
        410: jsonContent(errorSchema, "Token expired or already used"),
      }),
    }),
    async (c) => {
      const { token } = c.req.param();
      const userId = c.get("userId");

      const invite = await inviteTokenRepo.findValid(token);
      if (!invite)
        throw new HTTPException(410, { message: "Invite link has expired or already been used" });
      if (invite.createdByUserId === userId)
        throw new HTTPException(400, { message: "Cannot accept your own invite" });

      await inviteTokenRepo.consume(invite, userId);
      return c.json({ ok: true as const }, 200);
    },
  );
