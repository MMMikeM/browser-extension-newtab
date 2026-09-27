import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import categoryRepo, {
  categoryInsertSchema,
  categoryUpdateSchema,
  categoryDeleteSchema,
  categoryResponseSchema,
} from "../db/category.repo";
import categoryCollaboratorRepo from "../db/category-collaborator.repo";
import taskRepo from "../db/task.repo";
import userRepo, { userPublicSchema } from "../db/user.repo";
import contactRepo from "../db/contact.repo";
import { authed } from "../middleware";
import { broadcast, broadcastAll } from "../broadcast";
import { sendNotification, getUserName } from "../notify";
import { errorSchema } from "./openapi-schemas";
import { jsonBody, jsonContent, withAuth } from "./crud";

const collaboratorSchema = z.object({ username: z.string().min(1) });
const collaboratorIdSchema = z.object({ userId: z.string() });

export const categoryRoutes = authed()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: withAuth({ 200: jsonContent(z.array(categoryResponseSchema)) }),
    }),
    async (c) => c.json(await categoryRepo.list(c.get("userId")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      request: jsonBody(categoryInsertSchema),
      responses: withAuth({ 200: jsonContent(categoryResponseSchema) }),
    }),
    async (c) => {
      const userId = c.get("userId");
      const result = await categoryRepo.insert({ ...c.req.valid("json"), userId });
      broadcast(c, "categories", "insert", result, [userId]);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      request: jsonBody(categoryUpdateSchema),
      responses: withAuth({
        200: jsonContent(categoryResponseSchema),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const { id, updatedAt, ...fields } = c.req.valid("json");
      const userId = c.get("userId");

      const cat = await categoryRepo.findByIdWithCollaborators(id);
      if (cat.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });
      const catUserIds = [
        cat.userId,
        ...cat.collaborators.flatMap((c) => (c.user ? [c.user.id] : [])),
      ];

      const result = await categoryRepo.update(id, updatedAt, fields);
      broadcast(c, "categories", "update", result, catUserIds);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/",
      request: jsonBody(categoryDeleteSchema),
      responses: withAuth({
        200: jsonContent(categoryResponseSchema),
        400: jsonContent(errorSchema, "Bad request"),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const { id, tasks: taskAction } = c.req.valid("json");
      const userId = c.get("userId");

      // findByIdWithCollaborators used (not findById) so we have userIds for broadcast
      // before the row is deleted — after deletion we can't look up collaborators.
      const [cat, categoryTasks] = await Promise.all([
        categoryRepo.findByIdWithCollaborators(id),
        taskRepo.listInCategory(id),
      ]);
      if (cat.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });
      const catUserIds = [
        cat.userId,
        ...cat.collaborators.flatMap((c) => (c.user ? [c.user.id] : [])),
      ];

      const topLevelIds = categoryTasks.filter((t) => t.categoryId === id).map((t) => t.id);
      if (topLevelIds.length > 0 && !taskAction)
        throw new HTTPException(400, {
          message: "Move or delete all tasks before removing this category",
        });

      const affectedIds = taskAction === "delete" ? categoryTasks.map((t) => t.id) : topLevelIds;
      const { category, updatedTasks } = await categoryRepo.removeWithTasks(
        id,
        affectedIds,
        taskAction ?? "uncategorise",
      );

      const taskEvents =
        taskAction === "delete"
          ? affectedIds.map((taskId) => ({
              model: "tasks" as const,
              action: "delete" as const,
              data: { id: taskId },
            }))
          : updatedTasks.map((task) => ({
              model: "tasks" as const,
              action: "update" as const,
              data: task,
            }));
      broadcastAll(
        c,
        [...taskEvents, { model: "categories", action: "delete", data: { id: category.id } }],
        catUserIds,
      );
      // Task owners who have left the category, and people a task is shared with, hold the
      // tasks but not the category
      const outsideUserIds = [
        ...new Set(
          categoryTasks.flatMap((t) => [t.userId, ...t.shares.map((s) => s.sharedWithUserId)]),
        ),
      ].filter((uid) => !catUserIds.includes(uid));
      if (taskEvents.length > 0 && outsideUserIds.length > 0)
        broadcastAll(c, taskEvents, outsideUserIds);

      return c.json(category, 200);
    },
  )
  // --- Collaborator sub-routes ---
  .openapi(
    createRoute({
      method: "get",
      path: "/:id/collaborators",
      responses: withAuth({
        200: jsonContent(z.array(userPublicSchema)),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const { id } = c.req.param();
      const userId = c.get("userId");

      const cat = await categoryRepo.findByIdWithCollaborators(id);
      if (cat.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });

      return c.json(
        cat.collaborators.flatMap((c) =>
          c.user
            ? [
                {
                  id: c.user.id,
                  name: c.user.name,
                  username: c.user.username,
                  avatarUrl: c.user.avatarUrl,
                },
              ]
            : [],
        ),
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/:id/collaborators",
      request: jsonBody(collaboratorSchema),
      responses: withAuth({
        200: jsonContent(userPublicSchema),
        400: jsonContent(errorSchema, "Bad request"),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const { id } = c.req.param();
      const userId = c.get("userId");
      const { username } = c.req.valid("json");

      const [cat, targetUser] = await Promise.all([
        categoryRepo.findById(id),
        userRepo.findByUsername(username.toLowerCase()),
      ]);

      if (cat.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });
      if (targetUser.id === userId)
        throw new HTTPException(400, { message: "Cannot add yourself as a collaborator" });

      const isContact = await contactRepo.exists(userId, targetUser.id);
      if (!isContact)
        throw new HTTPException(400, { message: "Can only add contacts as collaborators" });

      await categoryCollaboratorRepo.add(id, targetUser.id);

      const actorName = await getUserName(userId);
      sendNotification(targetUser.id, {
        type: "category-shared",
        categoryId: id,
        categoryName: cat.name,
        fromUser: actorName,
      }).catch(() => {});

      return c.json(
        {
          id: targetUser.id,
          name: targetUser.name,
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl,
        },
        200,
      );
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/:id/collaborators/:userId",
      responses: withAuth({
        200: jsonContent(collaboratorIdSchema),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const { id, userId: targetUserId } = c.req.param();
      const userId = c.get("userId");
      const isSelf = targetUserId === userId;

      const cat = await categoryRepo.findById(id);
      if (cat.userId !== userId && !isSelf)
        throw new HTTPException(403, { message: "Not authorized" });

      await categoryCollaboratorRepo.remove(id, targetUserId);
      // Notify the removed user so the category disappears from their collection
      broadcast(c, "categories", "delete", { id }, [targetUserId]);
      return c.json({ userId: targetUserId }, 200);
    },
  );
