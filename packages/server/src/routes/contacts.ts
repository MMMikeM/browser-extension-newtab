import { createRoute, z } from "@hono/zod-openapi";
import contactRepo, { contactResponseSchema } from "../db/contact.repo";
import categoryCollaboratorRepo from "../db/category-collaborator.repo";
import { authed } from "../middleware";
import { errorSchema } from "./openapi-schemas";
import { jsonContent, withAuth } from "./crud";

export const contactRoutes = authed()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: withAuth({ 200: jsonContent(z.array(contactResponseSchema)) }),
    }),
    async (c) => c.json(await contactRepo.list(c.get("userId")), 200),
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/:id",
      responses: withAuth({
        200: jsonContent(z.object({ id: z.string() })),
        404: jsonContent(errorSchema, "Not found"),
      }),
    }),
    async (c) => {
      const { id } = c.req.param();
      const userId = c.get("userId");
      const contact = await contactRepo.remove(id, userId);
      // Revoke all shared category access between the two users
      await categoryCollaboratorRepo.removeAllBetweenUsers(userId, contact.contactUserId);
      return c.json({ id: contact.id }, 200);
    },
  );
