import { startOfflineExecutor, NonRetriableError } from "@tanstack/offline-transactions";
import { tasksCollection, categoriesCollection, notesCollection } from "~/lib/collections";
import { client } from "~/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- transaction mutation payloads are untyped
type AnyJson = any;

interface ResourceEndpoint {
  $post: (opts: { json: AnyJson }) => Promise<Response>;
  $put: (opts: { json: AnyJson }) => Promise<Response>;
  $delete: (opts: { json: AnyJson }) => Promise<Response>;
}

const assertOk = async (res: Response): Promise<void> => {
  if (res.ok) return;
  if (res.status >= 400 && res.status < 500) throw new NonRetriableError(await res.text());
  throw new Error(`Server error ${res.status}`);
};

const createSyncFn =
  (endpoint: ResourceEndpoint, stripKeys: string[] = []) =>
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
      if (m.type === "insert") {
        const payload = { ...m.modified };
        for (const k of stripKeys) delete payload[k];
        await assertOk(await endpoint.$post({ json: payload }));
      } else if (m.type === "update") {
        await assertOk(await endpoint.$put({ json: { ...m.changes, id: m.key } }));
      } else if (m.type === "delete") {
        await assertOk(await endpoint.$delete({ json: { id: m.key } }));
      }
    }
  };

export const offline = startOfflineExecutor({
  collections: { tasks: tasksCollection, categories: categoriesCollection, notes: notesCollection },
  mutationFns: {
    syncTasks: createSyncFn(client.api.tasks, ["subtasks", "shares"]),
    syncCategories: createSyncFn(client.api.categories),
    syncNotes: createSyncFn(client.api.notes),
  },
});
