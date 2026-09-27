/**
 * The ONLY non-infrastructure module allowed to import `{ client }`: components and routes
 * call these functions instead of reaching for the API client. Infrastructure files
 * (collections.ts, offline.ts, push.ts) are exempt.
 */
import { client } from "~/lib/api";
import { categoriesCollection, contactsCollection } from "~/lib/db/collections";

export const createInvite = async (): Promise<{ token: string; expiresAt: string }> => {
  const res = await client.api.invites.$post();
  if (!res.ok) throw new Error("Failed to create invite");
  return res.json() as Promise<{ token: string; expiresAt: string }>;
};

export const acceptInvite = async (token: string) => {
  const res = await client.api.invites[":token"].accept.$post({ param: { token } });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to accept invite");
  }
  // Fire-and-forget — the invite is accepted regardless of whether the
  // local collection refreshes successfully. Awaiting this would surface
  // a misleading error after a successful server-side acceptance, and the
  // consumed token would then prevent any retry.
  contactsCollection.utils.refetch().catch(console.error);
};

/** Removes the contact for both people, not only this user. */
export const removeContact = async (id: string) => {
  await client.api.contacts[":id"].$delete({ param: { id } });
  await contactsCollection.utils.refetch();
};

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

/** Owner only; a collaborator removes themselves with leaveCategory. */
export const removeCollaborator = async (categoryId: string, userId: string) => {
  await client.api.categories[":id"].collaborators[":userId"].$delete({
    param: { id: categoryId, userId },
  });
  await categoriesCollection.utils.refetch();
};

export const leaveCategory = async (categoryId: string, userId: string) => {
  const res = await client.api.categories[":id"].collaborators[":userId"].$delete({
    param: { id: categoryId, userId },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to leave category");
  }
  categoriesCollection.utils.writeDelete(categoryId as never);
};

export const shareTask = async (taskId: string, username: string, permission: "view" | "edit") => {
  const res = await client.api.tasks.share.$post({ json: { taskId, username, permission } });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to share");
  }
};

export const removeTaskShare = async (shareId: string) => {
  await client.api.tasks.share.$delete({ json: { id: shareId } });
};

/** Files a task shared with this user under one of their own categories. */
export const updateShareCategory = async (taskId: string, categoryId: string | null) => {
  const res = await client.api.tasks.share.$put({ json: { taskId, categoryId } });
  if (!res.ok) throw new Error("Failed to update category");
};

export const authenticate = async (
  mode: "login" | "signup",
  fields: { username: string; password: string; name: string },
): Promise<{ userId: string; token: string; name: string; username: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Request timed out — check your connection and try again")),
    15_000,
  );
  try {
    const endpoint = mode === "login" ? client.api.auth.login : client.api.auth.signup;
    const res = await endpoint.$post({ json: fields }, { init: { signal: controller.signal } });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      throw new Error(body.error ?? "Authentication failed");
    }
    return res.json() as Promise<{ userId: string; token: string; name: string; username: string }>;
  } catch (err) {
    if (controller.signal.aborted) {
      throw controller.signal.reason instanceof Error
        ? controller.signal.reason
        : new Error("Request timed out — check your connection and try again");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export const logout = async () => {
  try {
    await client.api.auth.logout.$post();
  } catch {
    // best-effort; caller clears local state regardless
  }
};
