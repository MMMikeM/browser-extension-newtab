/**
 * Server-side-only actions.
 *
 * This is the ONLY non-infrastructure module allowed to import `{ client }`.
 * Components and routes must call these functions instead of reaching for the
 * API client directly. Infrastructure files (collections.ts, offline.ts,
 * push.ts) are exempt from this rule.
 */
import { client } from "~/lib/api";
import { categoriesCollection, contactsCollection } from "~/lib/db/collections";

/** Creates a shareable invite link token. */
export const createInvite = async (): Promise<{ token: string; expiresAt: string }> => {
  const res = await client.api.invites.$post();
  if (!res.ok) throw new Error("Failed to create invite");
  return res.json() as Promise<{ token: string; expiresAt: string }>;
};

/** Accepts a contact invite by token, then refreshes the contacts collection. */
export const acceptInvite = async (token: string) => {
  const res = await client.api.invites[":token"].accept.$post({ param: { token } });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to accept invite");
  }
  await contactsCollection.utils.refetch();
};

/** Removes a contact (both directions on the server), then refreshes contacts. */
export const removeContact = async (id: string) => {
  await client.api.contacts[":id"].$delete({ param: { id } });
  await contactsCollection.utils.refetch();
};

/** Adds a collaborator to a category by username, then refreshes categories. */
export const addCollaborator = async (categoryId: string, username: string) => {
  const res = await client.api.categories[":id"].collaborators.$post({
    param: { id: categoryId },
    json: { username },
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to add collaborator");
  }
  await categoriesCollection.utils.refetch();
};

/** Removes a collaborator from a category (owner action), then refreshes categories. */
export const removeCollaborator = async (categoryId: string, userId: string) => {
  await client.api.categories[":id"].collaborators[":userId"].$delete({
    param: { id: categoryId, userId },
  });
  await categoriesCollection.utils.refetch();
};

/** Leaves a shared category (self-remove), then refreshes categories. */
export const leaveCategory = async (categoryId: string, userId: string) => {
  await client.api.categories[":id"].collaborators[":userId"].$delete({
    param: { id: categoryId, userId },
  });
  await categoriesCollection.utils.refetch();
};

/** Shares a task with another user by username. */
export const shareTask = async (taskId: string, username: string, permission: "view" | "edit") => {
  const res = await client.api.tasks.share.$post({ json: { taskId, username, permission } });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to share");
  }
};

/** Removes a task share by share record ID. */
export const removeTaskShare = async (shareId: string) => {
  await client.api.tasks.share.$delete({ json: { id: shareId } });
};

/** Authenticates (login or signup), returning the session result. */
export const authenticate = async (
  mode: "login" | "signup",
  fields: { username: string; password: string; name: string },
): Promise<{ userId: string; token: string; name: string; username: string }> => {
  const endpoint = mode === "login" ? client.api.auth.login : client.api.auth.signup;
  const res = await endpoint.$post({ json: fields });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Authentication failed");
  }
  return res.json() as Promise<{ userId: string; token: string; name: string; username: string }>;
};

/** Signs out on the server (best-effort). Caller is responsible for clearing local state. */
export const logout = async () => {
  try {
    await client.api.auth.logout.$post();
  } catch {
    // best-effort; caller clears local state regardless
  }
};
