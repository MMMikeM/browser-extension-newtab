export type PushPayload =
  | { type: "sync" }
  | { type: "task-shared"; taskId: string; taskTitle: string; fromUser: string }
  | { type: "task-updated"; taskId: string; taskTitle: string; fromUser: string; changes: string }
  | { type: "task-assigned"; taskId: string; taskTitle: string; fromUser: string }
  | { type: "task-completed"; taskId: string; taskTitle: string; byUser: string }
  | { type: "category-shared"; categoryId: string; categoryName: string; fromUser: string }
  | { type: "contact-accepted"; contactName: string }
  | { type: "reminder-due"; taskId: string; taskTitle: string; dueDate: string }
  | { type: "overdue-digest"; tasks: Array<{ id: string; title: string; dueDate: string }> };

/** Map a push payload to the notification the SW should display. Returns null for silent types. */
export const toNotification = (
  payload: PushPayload,
): { title: string; body: string; url: string } | null => {
  switch (payload.type) {
    case "sync":
      return null;
    case "task-shared":
      return {
        title: payload.fromUser,
        body: `Shared "${payload.taskTitle}" with you`,
        url: `#/tasks/${payload.taskId}`,
      };
    case "task-updated":
      return {
        title: payload.fromUser,
        body: `Updated "${payload.taskTitle}": ${payload.changes}`,
        url: `#/tasks/${payload.taskId}`,
      };
    case "task-assigned":
      return {
        title: payload.fromUser,
        body: `Assigned "${payload.taskTitle}" to you`,
        url: `#/tasks/${payload.taskId}`,
      };
    case "task-completed":
      return {
        title: payload.byUser,
        body: `Completed "${payload.taskTitle}"`,
        url: `#/tasks/${payload.taskId}`,
      };
    case "category-shared":
      return {
        title: payload.fromUser,
        body: `Shared category "${payload.categoryName}" with you`,
        url: `#/categories/${payload.categoryId}`,
      };
    case "contact-accepted":
      return {
        title: "Ajot",
        body: `${payload.contactName} accepted your contact request`,
        url: "#/settings",
      };
    case "reminder-due":
      return {
        title: "Reminder",
        body: `"${payload.taskTitle}" is due`,
        url: `#/tasks/${payload.taskId}`,
      };
    case "overdue-digest":
      return {
        title: "Overdue tasks",
        body: `You have ${payload.tasks.length} overdue task${payload.tasks.length === 1 ? "" : "s"}`,
        url: "#/",
      };
  }
};
