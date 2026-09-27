import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { acceptInvite } from "~/lib/actions";
import { useAuthToken } from "~/lib/auth/token";
import { Button } from "~/components/ui/button";

export const Route = createLazyFileRoute("/invite/$token")({
  component: InviteAcceptPage,
});

// Not the solid primary fill: its text falls under 4.5:1
const primaryPill =
  "w-full bg-primary-subtle text-primary hover:bg-primary-selected hover:text-primary touch:h-11";

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
    <div className="flex flex-col items-center justify-start pt-[20vh] pb-16 touch:flex-1 touch:overflow-y-auto touch:pt-[12vh] touch:pb-10">
      <div className="flex w-full max-w-xs flex-col gap-8">
        <h2 className="font-display text-[1.75rem] leading-tight text-balance text-foreground">
          {isSuccess ? "You're now connected!" : "You've been invited to connect."}
        </h2>
        {isSuccess ? (
          <Button
            variant="ghost"
            className={primaryPill}
            onClick={() => router.navigate({ to: "/people" })}
          >
            Go to People
            <ArrowRight data-icon="inline-end" />
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            {errorMsg && (
              <div
                role="alert"
                className="mb-1 rounded-md border border-destructive bg-destructive-subtle px-3 py-2 text-sm text-destructive"
              >
                {errorMsg}
              </div>
            )}
            <Button variant="ghost" className={primaryPill} onClick={accept} disabled={isPending}>
              {isPending ? "Accepting…" : "Accept invite"}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              className="self-center touch:h-10 touch:text-sm"
              onClick={() => router.navigate({ to: "/" })}
            >
              Go to app
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
