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

  // 1. Process pending reminders
  const pending = await notificationQueueRepo.findPending(ts);
  const processedIds: string[] = [];

  for (const row of pending) {
    if (row.type === "reminder-due" && row.task) {
      // Only send if task still exists and isn't done
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

  // Mark all processed rows as sent
  await notificationQueueRepo.markSent(processedIds, ts);

  // 2. Overdue digest — one per user per day max
  const alreadySentUserIds = new Set(
    await notificationQueueRepo.findDigestUserIdsSince(todayStr + "T00:00:00.000Z"),
  );

  const overdueTasks = await taskRepo.findOverdue(todayStr);

  // Group by userId, skip users who already got a digest today
  const byUser = new Map<string, Array<{ id: string; title: string; dueDate: string }>>();
  for (const task of overdueTasks) {
    if (!task.dueDate || alreadySentUserIds.has(task.userId)) continue;
    const list = byUser.get(task.userId) ?? [];
    list.push({ id: task.id, title: task.title, dueDate: task.dueDate });
    byUser.set(task.userId, list);
  }

  // Send one overdue-digest push per user, record in queue for daily dedup
  let digestCount = 0;
  for (const [userId, userTasks] of byUser) {
    await sendNotification(userId, { type: "overdue-digest", tasks: userTasks });
    // Record that this user got a digest today so subsequent cron runs skip them
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
