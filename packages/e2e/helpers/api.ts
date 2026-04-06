const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

type Task = { id: string; categoryId: string | null; [key: string]: unknown };

/**
 * Raw API helper — hits the server directly, bypassing the browser.
 * Use for test setup/teardown where going through the UI would be slow.
 */
export const apiRequest = async <T>(
  method: string,
  path: string,
  body: unknown,
  token: string,
): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API ${method} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
};

/**
 * Deletes all tasks belonging to a category via the API.
 * Faster than clicking through the UI and leaves no trace in the outbox.
 */
export const deleteAllTasksInCategory = async (
  token: string,
  categoryId: string,
): Promise<void> => {
  const tasks = await apiRequest<Task[]>("GET", "/api/tasks", undefined, token);
  const targets = tasks.filter((t) => t.categoryId === categoryId);
  await Promise.all(targets.map((t) => apiRequest("DELETE", "/api/tasks", { id: t.id }, token)));
};
