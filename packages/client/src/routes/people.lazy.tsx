import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "~/lib/api";
import { getAuthToken } from "~/lib/auth/token";

export const Route = createLazyFileRoute("/people")({
  component: PeoplePage,
});

export function PeoplePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  type Contact = {
    id: string;
    userId: string;
    contactUserId: string;
    createdAt: string;
    contactUser: { id: string; name: string; username: string; avatarUrl: string | null } | null;
  };

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await client.api.contacts.$get();
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json() as Promise<Contact[]>;
    },
    enabled: !!getAuthToken(),
  });

  const { mutate: invite, isPending: inviting } = useMutation({
    mutationFn: async () => {
      const res = await client.api.invites.$post();
      if (!res.ok) throw new Error("Failed to create invite");
      return res.json() as Promise<{ token: string; expiresAt: string }>;
    },
    onSuccess: ({ token }) => {
      const base = window.location.origin + window.location.pathname;
      const url = `${base}#/invite/${token}`;
      if (navigator.share) {
        navigator.share({ title: "Join me on Todo", url }).catch(() => {
          navigator.clipboard.writeText(url);
        });
      } else {
        navigator.clipboard.writeText(url);
      }
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: async (id: string) => {
      await client.api.contacts[":id"].$delete({ param: { id } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.navigate({ to: "/" })}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold">People</h1>
      </div>

      <button
        onClick={() => invite()}
        disabled={inviting}
        className="self-start rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50"
      >
        {inviting ? "Generating link…" : "Invite someone"}
      </button>

      <div className="flex flex-col gap-1">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No contacts yet. Invite someone to get started.
          </p>
        )}
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="group/contact flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
          >
            <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
              {(contact.contactUser?.name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {contact.contactUser?.name ?? "Unknown"}
              </span>
              {contact.contactUser?.username && (
                <span className="text-xs text-muted-foreground">
                  @{contact.contactUser.username}
                </span>
              )}
            </div>
            <button
              onClick={() => remove(contact.id)}
              className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/contact:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
