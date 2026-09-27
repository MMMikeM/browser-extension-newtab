import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { now, today } from "@newtab-todo/shared/iso";
import notificationQueueRepo from "../db/notification-queue.repo";
import taskRepo from "../db/task.repo";
import { sendNotification } from "../notify";

const app = new Hono();

app.post("/process", async (c) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new HTTPException(500, { message: "CRON_SECRET not configured" });

  const auth = c.req.header("authorization");
  if (auth !== `Bearer ${secret}`) {
    throw new HTTPException(401, { message: "Invalid cron secret" });
  }

  const ts = now();
  const todayStr = today();

  const pending = await notificationQueueRepo.findPending(ts);
  const processedIds: string[] = [];

  for (const row of pending) {
    if (row.type === "reminder-due" && row.task) {
      if (row.task.status !== "done") {
        await sendNotification(row.userId, {
          type: "reminder-due",
          taskId: row.task.id,
          taskTitle: row.task.title,
          dueDate: row.task.dueDate ?? "",
        });
      }
    }
    processedIds.push(row.id);
  }

  await notificationQueueRepo.markSent(processedIds, ts);

  // At most one overdue digest per user per day
  const alreadySentUserIds = new Set(
    await notificationQueueRepo.findDigestUserIdsSince(todayStr + "T00:00:00.000Z"),
  );

  const overdueTasks = await taskRepo.findOverdue(todayStr);

  const byUser = new Map<string, Array<{ id: string; title: string; dueDate: string }>>();
  for (const task of overdueTasks) {
    if (!task.dueDate || alreadySentUserIds.has(task.userId)) continue;
    const list = byUser.get(task.userId) ?? [];
    list.push({ id: task.id, title: task.title, dueDate: task.dueDate });
    byUser.set(task.userId, list);
  }

  let digestCount = 0;
  for (const [userId, userTasks] of byUser) {
    await sendNotification(userId, { type: "overdue-digest", tasks: userTasks });
    // Recorded so later cron runs today skip this user
    await notificationQueueRepo.insertSent({
      userId,
      type: "overdue-digest",
      taskId: null,
      scheduledFor: ts,
      sentAt: ts,
    });
    digestCount++;
  }

  console.log(`[cron] Processed ${processedIds.length} reminders, ${digestCount} overdue digests`);
  return c.json({ ok: true, reminders: processedIds.length, digests: digestCount }, 200);
});

export const notificationRoutes = app;
