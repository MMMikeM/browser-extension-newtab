import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createId } from "@paralleldrive/cuid2";
import taskRepo, {
  taskInsertSchema,
  taskUpdateSchema,
  taskSelectSchema,
  taskShareSelectSchema,
  taskResponseSchema,
  taskShareResponseSchema,
  taskListItemSchema,
} from "../db/task.repo";
import userRepo from "../db/user.repo";
import contactRepo from "../db/contact.repo";
import categoryCollaboratorRepo from "../db/category-collaborator.repo";
import { authed } from "../middleware";
import { broadcast } from "../broadcast";
import { sendNotification, getUserName } from "../notify";
import notificationQueueRepo from "../db/notification-queue.repo";
import { errorSchema } from "./openapi-schemas";
import { jsonBody, jsonContent, withAuth } from "./crud";

const shareSchema = z.object({
  taskId: z.string(),
  username: z.string().min(1),
  permission: z.enum(["view", "edit"]).default("edit"),
});

const shareCategorySchema = z.object({
  taskId: z.string(),
  categoryId: z.string().nullable(),
});

/** Returns deduplicated userIds that should receive broadcast events for this task. */
const taskUserIds = (task: {
  userId: string;
  category?: { collaborators: { userId: string }[] } | null;
  parent?: {
    userId: string;
    shares?: { sharedWithUserId: string }[];
    category?: { collaborators: { userId: string }[] } | null;
  } | null;
}) => [
  ...new Set([
    task.userId,
    ...(task.category?.collaborators.map((c) => c.userId) ?? []),
    // For subtasks, include parent's owner, share recipients, and category collaborators
    ...(task.parent ? [task.parent.userId] : []),
    ...(task.parent?.shares?.map((s) => s.sharedWithUserId) ?? []),
    ...(task.parent?.category?.collaborators.map((c) => c.userId) ?? []),
  ]),
];

export const taskRoutes = authed()
  .openapi(
    createRoute({
      method: "get",
      path: "/",
      responses: withAuth({ 200: jsonContent(z.array(taskListItemSchema)) }),
    }),
    async (c) => c.json(await taskRepo.list(c.get("userId")), 200),
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/",
      request: jsonBody(taskInsertSchema),
      responses: withAuth({
        200: jsonContent(taskResponseSchema),
        400: jsonContent(errorSchema, "Bad request"),
      }),
    }),
    async (c) => {
      const data = c.req.valid("json");
      const userId = c.get("userId");

      // For subtasks, resolve the parent's categoryId for collaborator broadcast
      let effectiveCategoryId = data.categoryId;
      if (data.parentId) {
        const parent = await taskRepo.findById(data.parentId);
        if (parent.parentId)
          throw new HTTPException(400, { message: "Cannot nest subtasks more than one level" });
        effectiveCategoryId = parent.categoryId;
      }

      const result = await taskRepo.insert({ ...data, userId });
      const taskWithRelations = { ...result, subtasks: [], shares: [] };

      const collabIds = effectiveCategoryId
        ? await categoryCollaboratorRepo.listUserIds(effectiveCategoryId)
        : [];
      broadcast(c, "tasks", "insert", taskWithRelations, [...new Set([userId, ...collabIds])]);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/",
      request: jsonBody(taskUpdateSchema),
      responses: withAuth({ 200: jsonContent(taskResponseSchema) }),
    }),
    async (c) => {
      const { id, updatedAt, ...fields } = c.req.valid("json");
      const userId = c.get("userId");

      // Parallel: fetch task (with all collab userIds) + contact check (if assigneeId set).
      const [task, isContact] = await Promise.all([
        taskRepo.findByIdWithAccess(id, userId),
        fields.assigneeId ? contactRepo.exists(userId, fields.assigneeId) : Promise.resolve(true),
      ]);

      const collabUserIds = [
        ...(task.category?.collaborators.map((c) => c.userId) ?? []),
        ...(task.parent?.category?.collaborators.map((c) => c.userId) ?? []),
      ];
      const parentShareUserIds = task.parent?.shares?.map((s) => s.sharedWithUserId) ?? [];
      const isOwner = task.userId === userId || task.parent?.userId === userId;
      const isCollab = collabUserIds.includes(userId);
      const isParentShareRecipient = parentShareUserIds.includes(userId);
      if (!isOwner && !isCollab && !isParentShareRecipient)
        throw new HTTPException(403, { message: "Not authorized" });
      if (!isContact) throw new HTTPException(400, { message: "Can only assign to a contact" });

      const result = await taskRepo.update(id, updatedAt, fields);
      broadcast(c, "tasks", "update", result, taskUserIds(task));

      // --- Notifications (fire-and-forget) ---
      const notifiableFields = ["title", "description", "status", "dueDate"] as const;
      const changedNotifiable = notifiableFields.filter((f) => f in fields);
      const assigneeChanged = fields.assigneeId && fields.assigneeId !== task.assigneeId;

      if (changedNotifiable.length > 0 || assigneeChanged) {
        const actorName = await getUserName(userId);

        // Collect recipients: task owner + share recipients + category collaborators, excluding actor
        const shareUserIds = await taskRepo.listShareUserIds(id).catch(() => []);
        const allRecipients = [...new Set([...taskUserIds(task), ...shareUserIds])].filter(
          (uid) => uid !== userId,
        );

        if (fields.status === "done" && task.status !== "done") {
          // Task completed (only if it wasn't already done)
          for (const recipientId of allRecipients) {
            sendNotification(recipientId, {
              type: "task-completed",
              taskId: id,
              taskTitle: result.title,
              byUser: actorName,
            }).catch(() => {});
          }
        } else if (assigneeChanged) {
          // Task assigned — independent trigger, not gated on notifiable fields
          sendNotification(fields.assigneeId!, {
            type: "task-assigned",
            taskId: id,
            taskTitle: result.title,
            fromUser: actorName,
          }).catch(() => {});
        } else if (changedNotifiable.length > 0 && allRecipients.length > 0) {
          // General update — describe what changed
          const changeDescriptions = changedNotifiable.map((f) => {
            if (f === "status") return `status → ${result.status}`;
            if (f === "dueDate")
              return result.dueDate ? `due ${result.dueDate}` : "due date removed";
            return f;
          });
          for (const recipientId of allRecipients) {
            sendNotification(recipientId, {
              type: "task-updated",
              taskId: id,
              taskTitle: result.title,
              fromUser: actorName,
              changes: changeDescriptions.join(", "),
            }).catch(() => {});
          }
        }
      }

      // --- Notification queue: due date reminders ---
      if ("dueDate" in fields) {
        // Always clear old pending reminders for this task
        await notificationQueueRepo.deleteByTask(id);
        // If a new due date was set, queue a reminder
        if (fields.dueDate) {
          await notificationQueueRepo.insert({
            userId: task.userId,
            type: "reminder-due",
            taskId: id,
            scheduledFor: fields.dueDate,
          });
        }
      }

      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/",
      request: jsonBody(taskSelectSchema),
      responses: withAuth({ 200: jsonContent(taskResponseSchema) }),
    }),
    async (c) => {
      const { id } = c.req.valid("json");
      const userId = c.get("userId");

      const task = await taskRepo.findByIdWithAccess(id, userId);
      const isOwner = task.userId === userId || task.parent?.userId === userId;
      if (!isOwner) throw new HTTPException(403, { message: "Not authorized" });

      const { task: removed, subtaskIds } = await taskRepo.remove(id);
      for (const removedId of [removed.id, ...subtaskIds])
        broadcast(c, "tasks", "delete", { id: removedId }, taskUserIds(task));
      return c.json(removed, 200);
    },
  )
  .openapi(
    createRoute({
      method: "post",
      path: "/share",
      request: jsonBody(shareSchema),
      responses: withAuth({
        200: jsonContent(taskShareResponseSchema),
        400: jsonContent(errorSchema, "Bad request"),
        403: jsonContent(errorSchema, "Forbidden"),
      }),
    }),
    async (c) => {
      const data = c.req.valid("json");
      const userId = c.get("userId");
      const [task, targetUser] = await Promise.all([
        taskRepo.findById(data.taskId),
        userRepo.findByUsername(data.username.toLowerCase()),
      ]);
      if (task.userId !== userId) throw new HTTPException(403, { message: "Not authorized" });
      if (targetUser.id === userId)
        throw new HTTPException(400, { message: "Cannot share with yourself" });

      const result = await taskRepo.insertShare({
        id: createId(),
        taskId: data.taskId,
        sharedWithUserId: targetUser.id,
        permission: data.permission,
      });
      broadcast(c, "tasks", "update", { id: data.taskId }, [task.userId, targetUser.id]);

      const actorName = await getUserName(userId);
      sendNotification(targetUser.id, {
        type: "task-shared",
        taskId: data.taskId,
        taskTitle: task.title,
        fromUser: actorName,
      }).catch(() => {});

      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "delete",
      path: "/share",
      request: jsonBody(taskShareSelectSchema),
      responses: withAuth({ 200: jsonContent(taskShareResponseSchema) }),
    }),
    async (c) => {
      const result = await taskRepo.removeShare(c.req.valid("json").id);
      const task = await taskRepo.findById(result.taskId);
      broadcast(c, "tasks", "update", { id: result.taskId }, [
        task.userId,
        result.sharedWithUserId,
      ]);
      return c.json(result, 200);
    },
  )
  .openapi(
    createRoute({
      method: "put",
      path: "/share",
      request: jsonBody(shareCategorySchema),
      responses: withAuth({ 200: jsonContent(taskShareResponseSchema) }),
    }),
    async (c) => {
      const { taskId, categoryId } = c.req.valid("json");
      const userId = c.get("userId");
      const result = await taskRepo.updateShareCategory(taskId, userId, categoryId);
      broadcast(c, "tasks", "update", { id: taskId }, [userId]);
      return c.json(result, 200);
    },
  );
