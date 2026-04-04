import { startOfflineExecutor, NonRetriableError } from "@tanstack/offline-transactions";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { client } from "~/lib/api";
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
    for (const m of transaction.mutations) {
      console.log(`[sync:${name}] ${m.type} key=${m.key}`);

      if (m.type === "insert") {
        const payload = { ...m.modified };
        for (const k of stripKeys) delete payload[k];
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

export const offline = startOfflineExecutor({
  collections: { tasks: tasksCollection, categories: categoriesCollection, notes: notesCollection },
  mutationFns: {
    syncTasks: createSyncFn("tasks", client.api.tasks, tasksCollection, ["subtasks", "shares"]),
    syncCategories: createSyncFn("categories", client.api.categories, categoriesCollection),
    syncNotes: createSyncFn("notes", client.api.notes, notesCollection),
  },
});

// Kick off storage probe + leader election + outbox replay as early as possible.
offline.waitForInit().catch(console.error);
