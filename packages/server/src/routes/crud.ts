import { z } from "@hono/zod-openapi";
import { unauthorizedResponse } from "./openapi-schemas";

export const jsonBody = <T extends z.ZodType>(schema: T) =>
  ({ body: { content: { "application/json": { schema } } } }) as const;

export const jsonContent = <T extends z.ZodType>(schema: T, description = "OK") =>
  ({ description, content: { "application/json": { schema } } }) as const;

export const withAuth = <T extends Record<number, unknown>>(responses: T) =>
  ({ ...responses, 401: unauthorizedResponse }) as T & { 401: typeof unauthorizedResponse };
