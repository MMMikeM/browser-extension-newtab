import { startOfflineExecutor, NonRetriableError } from "@tanstack/offline-transactions";
import {
  tasksCollection,
  categoriesCollection,
  notesCollection,
  contactsCollection,
} from "~/lib/db/collections";
import { client } from "~/lib/api";
import { getAuthToken, subscribeAuthToken } from "~/lib/auth/token";
import { getCurrentUserId } from "~/lib/auth/current-user";
import type { CategoryTaskAction } from "~/lib/constants";
import type { Collection } from "@tanstack/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- transaction mutation payloads are untyped
type AnyJson = any;

interface ResourceEndpoint {
  $post: (opts: { json: AnyJson }) => Promise<Response>;
  $put: (opts: { json: AnyJson }) => Promise<Response>;
  $delete: (opts: { json: AnyJson }) => Promise<Response>;
}

const assertOk = async (res: Response): Promise<Response> => {
  if (res.ok) return res;
  if (res.status >= 400 && res.status < 500) throw new NonRetriableError(await res.text());
  throw new Error(`Server error ${res.status}`);
};

const createSyncFn =
  (
    name: string,
    endpoint: ResourceEndpoint,
    collection: Collection<any, any, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    stripKeys: string[] = [],
  ) =>
  async ({
    transaction,
  }: {
    transaction: {
      mutations: Array<{
        type: string;
        modified: Record<string, unknown>;
        changes: Record<string, unknown>;
        key: string;
      }>;
    };
  }) => {
    // No auth token — defer sync until login. A retriable error (not NonRetriableError)
    // keeps the transaction in the IDB outbox and holds the optimistic mutation visible.
    if (!getAuthToken()) throw new Error("Not authenticated");

    for (const m of transaction.mutations) {
      console.log(`[sync:${name}] ${m.type} key=${m.key}`);

      if (m.type === "insert") {
        const payload = { ...m.modified };
        for (const k of stripKeys) delete payload[k];
        // Tasks/categories/notes created offline carry a local device userId.
        // Always stamp with the current authenticated userId so the server FK passes.
        if ("userId" in payload) payload.userId = getCurrentUserId();
        console.log(`[sync:${name}] POST →`, payload);
        const res = await assertOk(await endpoint.$post({ json: payload }));
        const created = await res.json();
        console.log(`[sync:${name}] POST ← 200, writing to synced store`);
        collection.utils.writeUpsert(created as never);
      } else if (m.type === "update") {
        const payload = { ...m.changes, id: m.key };
        console.log(`[sync:${name}] PUT →`, payload);
        const res = await assertOk(await endpoint.$put({ json: payload }));
        const updated = await res.json();
        console.log(`[sync:${name}] PUT ← 200, writing to synced store`);
        collection.utils.writeUpdate(updated as never);
      } else if (m.type === "delete") {
        console.log(`[sync:${name}] DELETE → id=${m.key}`);
        await assertOk(await endpoint.$delete({ json: { id: m.key } }));
        console.log(`[sync:${name}] DELETE ← 200, removing from synced store`);
        collection.utils.writeDelete(m.key as never);
      }

      console.log(
        `[sync:${name}] ${m.type} complete — synced store updated before optimistic removal`,
      );
    }
  };

export type CategoryDeleteMetadata = { categoryId: string; tasks: CategoryTaskAction };

// One request for the category and its tasks: the server moves or deletes collaborators'
// tasks too, which this user can't change one by one
const deleteCategoryWithTasks = async ({
  transaction,
}: {
  transaction: { metadata: Record<string, unknown> };
}) => {
  if (!getAuthToken()) throw new Error("Not authenticated");
  const { categoryId, tasks } = transaction.metadata as CategoryDeleteMetadata;
  console.log(`[sync:categories] DELETE → id=${categoryId} tasks=${tasks}`);
  await assertOk(await client.api.categories.$delete({ json: { id: categoryId, tasks } }));
  // Refetch rather than write each row: SSE may already have applied some, and writing a
  // delete for a row the synced store no longer holds throws
  await Promise.all([categoriesCollection.utils.refetch(), tasksCollection.utils.refetch()]);
};

export const offline = startOfflineExecutor({
  collections: { tasks: tasksCollection, categories: categoriesCollection, notes: notesCollection },
  mutationFns: {
    syncTasks: createSyncFn("tasks", client.api.tasks, tasksCollection),
    syncCategories: createSyncFn("categories", client.api.categories, categoriesCollection, [
      "user",
      "collaborators",
    ]),
    syncNotes: createSyncFn("notes", client.api.notes, notesCollection),
    deleteCategory: deleteCategoryWithTasks,
  },
});

// Kick off storage probe + leader election + outbox replay as early as possible.
offline.waitForInit().catch(console.error);

subscribeAuthToken(() => {
  if (getAuthToken()) {
    tasksCollection.utils.refetch().catch(console.error);
    categoriesCollection.utils.refetch().catch(console.error);
    notesCollection.utils.refetch().catch(console.error);
    contactsCollection.utils.refetch().catch(console.error);
  }
});
