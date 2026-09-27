import { z } from "@hono/zod-openapi";

export const errorSchema = z.object({ error: z.string() });
export const okSchema = z.object({ ok: z.literal(true) });

export const unauthorizedResponse = {
  description: "Unauthorized",
  content: { "application/json": { schema: errorSchema } },
} as const;
