import { useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useContacts } from "~/lib/db/hooks";
import { createInvite, removeContact } from "~/lib/actions";
import { Button } from "~/components/ui/button";

export const Route = createLazyFileRoute("/people")({
  component: PeoplePage,
});

export function PeoplePage() {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);

  const { data: contacts = [], isLoading } = useContacts();

  const invite = async () => {
    setInviting(true);
    try {
      const { token } = await createInvite();
      const base = window.location.origin + window.location.pathname;
      const url = `${base}#/invite/${token}`;
      if (navigator.share) {
        navigator.share({ title: "Join me on Todo", url }).catch(() => {
          navigator.clipboard.writeText(url);
        });
      } else {
        navigator.clipboard.writeText(url);
      }
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="subtle" size="sm" onClick={() => router.navigate({ to: "/" })}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">People</h1>
      </div>

      <Button variant="outline" size="sm" onClick={invite} disabled={inviting} className="self-start">
        {inviting ? "Generating link…" : "Invite someone"}
      </Button>

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
              onClick={() => removeContact(contact.id)}
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
