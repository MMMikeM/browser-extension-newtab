import { useEffect, useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { acceptInvite } from "~/lib/actions";
import { useAuthToken } from "~/lib/auth/token";
import { Button } from "~/components/ui/button";

export const Route = createLazyFileRoute("/invite/$token")({
  component: InviteAcceptPage,
});

export function InviteAcceptPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const authToken = useAuthToken();
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      sessionStorage.setItem("pending-invite", token);
      void router.navigate({ to: "/auth" });
    }
  }, [authToken, token, router]);

  const accept = async () => {
    setIsPending(true);
    setErrorMsg(null);
    try {
      await acceptInvite(token);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsPending(false);
    }
  };

  if (!authToken) return null;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6">
      <div className="flex max-w-xs flex-col items-center gap-4 text-center">
        {isSuccess ? (
          <>
            <p className="text-lg font-semibold">You're now connected!</p>
            <Button variant="link" onClick={() => router.navigate({ to: "/people" })}>
              Go to People →
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-hint">You've been invited to connect.</p>
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
            <Button variant="outline" onClick={accept} disabled={isPending}>
              {isPending ? "Accepting…" : "Accept invite"}
            </Button>
            <Button variant="subtle" size="xs" onClick={() => router.navigate({ to: "/" })}>
              Go to app
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
