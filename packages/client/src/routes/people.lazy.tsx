import { useState } from "react";
import { Toast } from "@base-ui/react/toast";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { ChevronLeft, UserPlus } from "lucide-react";
import { useContacts } from "~/lib/db/hooks";
import { createInvite, removeContact } from "~/lib/actions";
import { getBuildTarget } from "~/lib/build-target";
import { Button } from "~/components/ui/button";
import { InitialsAvatar } from "~/components/ui/initials-avatar";
import { ListRow } from "~/components/ui/list-row";
import { RevealButton } from "~/components/ui/reveal-button";
import { TextStack } from "~/components/ui/text-stack";

export const Route = createLazyFileRoute("/people")({
  component: PeoplePage,
});

export function PeoplePage() {
  const router = useRouter();
  const toastManager = Toast.useToastManager();
  const [inviting, setInviting] = useState(false);

  const { data: contacts = [], isLoading } = useContacts();

  const invite = async () => {
    setInviting(true);
    try {
      const { token } = await createInvite();
      // Browser/PWA uses browser history — route is a real path, no hash.
      // Extension uses hash history AND chrome-extension:// origin — use
      // SERVER_URL so the link is openable outside that browser.
      const serverOrigin = import.meta.env.SERVER_URL || window.location.origin;
      const url =
        getBuildTarget() === "extension"
          ? `${serverOrigin}/#/invite/${token}`
          : `${window.location.origin}/invite/${token}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "Join me on Todo", url });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toastManager.add({ title: "Invite link copied", timeout: 5000, data: {} });
      } catch {
        toastManager.add({ title: `Copy this invite link: ${url}`, timeout: 0, data: {} });
      }
    } finally {
      setInviting(false);
    }
  };

  return (
    // AppShell already provides the column and gutters; on touch this is the scroll area
    <div className="flex flex-col gap-6 pt-1 touch:min-h-0 touch:flex-1 touch:overflow-y-auto touch:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center gap-1">
        <Button
          variant="subtle"
          size="sm"
          icon
          onClick={() => router.navigate({ to: "/" })}
          aria-label="Back to tasks"
          className="-ml-2 touch:size-10"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h2 className="text-lg font-semibold">People</h2>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={invite}
        disabled={inviting}
        className="self-start touch:h-10 touch:px-4"
      >
        <UserPlus />
        {inviting ? "Generating link…" : "Invite someone"}
      </Button>

      <div className="-mx-2 flex flex-col gap-1">
        {isLoading && <p className="text-sm text-hint">Loading…</p>}
        {!isLoading && contacts.length === 0 && (
          <p className="text-sm text-hint">No contacts yet. Invite someone to get started.</p>
        )}
        {contacts.map((contact) => (
          <ListRow key={contact.id}>
            <InitialsAvatar
              name={contact.contactUser?.name ?? "?"}
              size="md"
              className="size-8 text-sm"
            />
            <TextStack
              title={contact.contactUser?.name ?? "Unknown"}
              subtitle={
                contact.contactUser?.username ? `@${contact.contactUser.username}` : undefined
              }
            />
            <RevealButton onClick={() => removeContact(contact.id)}>Remove</RevealButton>
          </ListRow>
        ))}
      </div>
    </div>
  );
}
