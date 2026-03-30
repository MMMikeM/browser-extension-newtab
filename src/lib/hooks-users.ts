import { useValue } from "@legendapp/state/react";
import { createId } from "@paralleldrive/cuid2";
import { users$ } from "./store-users";
import type { User } from "~/rpc/users";

export const useUsers = () => {
  const usersMap = useValue(users$);
  const users = usersMap
    ? (Object.values(usersMap) as User[]).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return { data: users };
};

export const useAddUser = () => ({
  add: (fields: Pick<User, "name" | "email"> & Partial<Pick<User, "avatarUrl">>) => {
    const id = createId();
    users$[id].set({ ...fields, id } as User);
  },
});

export const useUpdateUser = () => ({
  mutate: ({ data: { id, ...fields } }: { data: { id: string; [k: string]: unknown } }) => {
    users$[id].assign(fields);
  },
});

export const useDeleteUser = () => ({
  mutate: ({ data: { id } }: { data: { id: string } }) => {
    users$[id]?.delete();
  },
});
