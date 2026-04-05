import { useEffect } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "~/lib/api";
import { getAuthToken } from "~/lib/auth/token";

export const Route = createLazyFileRoute("/invite/$token")({
  component: InviteAcceptPage,
});

export function InviteAcceptPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authToken = getAuthToken();

  useEffect(() => {
    if (!authToken) {
      sessionStorage.setItem("pending-invite", token);
      router.navigate({ to: "/auth" });
    }
  }, [authToken, token, router]);

  const {
    mutate: accept,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    mutationFn: async () => {
      const res = await client.api.invites[":token"].accept.$post({ param: { token } });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to accept invite");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  if (!authToken) return null;

  const errorMsg = error instanceof Error ? error.message : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-6">
      <div className="flex flex-col items-center gap-4 max-w-xs text-center">
        {isSuccess ? (
          <>
            <p className="text-lg font-semibold">You're now connected!</p>
            <button
              onClick={() => router.navigate({ to: "/people" })}
              className="text-sm text-primary hover:underline"
            >
              Go to People →
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">You've been invited to connect.</p>
            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}
            {!errorMsg && (
              <button
                onClick={() => accept()}
                disabled={isPending}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {isPending ? "Accepting…" : "Accept invite"}
              </button>
            )}
            <button
              onClick={() => router.navigate({ to: "/" })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Go to app
            </button>
          </>
        )}
      </div>
    </div>
  );
}
