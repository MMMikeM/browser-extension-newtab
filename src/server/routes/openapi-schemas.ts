import { z } from "zod/v4";

export const errorSchema = z.object({ error: z.string() });
export const okSchema = z.object({ ok: z.literal(true) });
