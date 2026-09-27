const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

type Task = { id: string; categoryId: string | null; [key: string]: unknown };

/** For test setup and teardown, where going through the UI would be slow. */
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

/** Safe to call repeatedly. */
export const ensureMutualContacts = async (token1: string, token2: string): Promise<void> => {
  let inviteToken: string;
  try {
    const invite = await apiRequest<{ token: string }>("POST", "/api/invites", undefined, token1);
    inviteToken = invite.token;
  } catch {
    // If invite creation fails for any reason, contacts may already exist — skip
    return;
  }
  try {
    await apiRequest("POST", `/api/invites/${inviteToken}/accept`, undefined, token2);
  } catch {
    // 410 = already used / expired; contacts already established
  }
};

/** Faster than the UI, and leaves nothing in the client's outbox. */
export const deleteAllTasksInCategory = async (
  token: string,
  categoryId: string,
): Promise<void> => {
  const tasks = await apiRequest<Task[]>("GET", "/api/tasks", undefined, token);
  const targets = tasks.filter((t) => t.categoryId === categoryId);
  await Promise.all(targets.map((t) => apiRequest("DELETE", "/api/tasks", { id: t.id }, token)));
};
