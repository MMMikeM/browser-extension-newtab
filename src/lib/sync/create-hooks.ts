import { useValue } from "@legendapp/state/react";
import { createId } from "@paralleldrive/cuid2";
import type { Observable } from "@legendapp/state";

type SortFn<T> = (a: T, b: T) => number;

export const createModelHooks = <T extends { id: string }>(
  store$: Observable<Record<string, T>>,
  options?: { sort?: SortFn<T> },
) => {
  const useList = () => {
    const map = useValue(store$);
    const items = map ? (Object.values(map) as T[]) : [];
    if (options?.sort) items.sort(options.sort);
    return { data: items };
  };

  const useAdd = () => ({
    add: (fields: Partial<T>): T => {
      const id = createId();
      const record = { ...fields, id } as T;
      (store$ as any)[id].set(record);
      return record;
    },
  });

  const useUpdate = () => ({
    mutate: ({ data: { id, ...fields } }: { data: { id: string; [k: string]: unknown } }) => {
      (store$ as any)[id].assign(fields);
    },
  });

  const useDelete = () => ({
    mutate: ({ data: { id } }: { data: { id: string } }) => {
      (store$ as any)[id]?.delete();
    },
  });

  return { useList, useAdd, useUpdate, useDelete };
};
