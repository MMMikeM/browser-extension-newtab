import { useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/mini";
import { setAuthToken } from "~/lib/auth/token";
import { setCurrentUser } from "~/lib/auth/current-user";
import { authenticate } from "~/lib/actions";
import { Button } from "~/components/ui/button";
import { FormField } from "~/components/ui/field";
import { Input } from "~/components/ui/field";
import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";

const loginSchema = z.object({
  username: z.string().check(z.minLength(1, "Username is required")),
  password: z.string().check(z.minLength(1, "Password is required")),
});

const signupSchema = z.object({
  username: z.string().check(z.minLength(3, "Username must be at least 3 characters")),
  password: z.string().check(z.minLength(8, "Password must be at least 8 characters")),
  name: z.string().check(z.minLength(1, "Name is required")),
});

const persistToken = (token: string) => {
  setAuthToken(token);
  if (getBuildTarget() === "extension") {
    browser.storage.local
      .set({ [TOKEN_KEY]: token })
      .then(() => browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {}));
  }
};

const AuthView = () => {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = mode === "login" ? loginSchema : signupSchema;
  const form = useForm({
    defaultValues: { username: "", password: "", name: "" },
    onSubmit: async ({ value }) => {
      setServerError(null);
      let result: { userId: string; token: string; name: string; username: string };
      try {
        result = await authenticate(mode, {
          username: value.username.trim(),
          password: value.password,
          name: value.name.trim(),
        });
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Authentication failed");
        return;
      }
      persistToken(result.token);
      setCurrentUser({ id: result.userId, name: result.name, username: result.username });
      let pendingInvite: string | null = null;
      try {
        pendingInvite = sessionStorage.getItem("pending-invite");
        if (pendingInvite) sessionStorage.removeItem("pending-invite");
      } catch {
        // sessionStorage unavailable in some contexts; proceed without invite redirect
      }
      if (pendingInvite) {
        router.navigate({ to: "/invite/$token", params: { token: pendingInvite } });
      } else {
        router.navigate({ to: "/" });
      }
    },
  });

  return (
    <div className="flex flex-col items-center justify-start pt-[20vh] pb-16 touch:flex-1 touch:overflow-y-auto touch:pt-[12vh] touch:pb-10">
      <div className="w-full max-w-xs">
        <p className="mb-6 text-center text-sm text-hint">
          {mode === "signup" ? "Create your account" : "Sign in to sync across devices"}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          {mode === "signup" && (
            <form.Field name="name" validators={{ onChange: signupSchema.shape.name }}>
              {(field) => (
                <FormField field={field} label="Name">
                  <Input
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="name"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                </FormField>
              )}
            </form.Field>
          )}
          <form.Field name="username" validators={{ onChange: schema.shape.username }}>
            {(field) => (
              <FormField field={field} label="Username">
                <Input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus={mode === "login"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  inputMode="text"
                />
              </FormField>
            )}
          </form.Field>
          <form.Field name="password" validators={{ onChange: schema.shape.password }}>
            {(field) => (
              <FormField field={field} label="Password">
                <Input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </FormField>
            )}
          </form.Field>
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive bg-destructive-subtle px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}
          <div className="mt-1 flex flex-col gap-2">
            <Button
              type="submit"
              variant="outline"
              className="w-full touch:h-11"
              disabled={form.state.isSubmitting}
            >
              {form.state.isSubmitting
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
            <div className="flex items-center justify-center gap-6">
              <Button
                type="button"
                variant="subtle"
                size="xs"
                className="touch:h-10 touch:text-sm"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  form.reset();
                  setServerError(null);
                }}
              >
                {mode === "login" ? "Create an account" : "Already have an account?"}
              </Button>
              <Button
                type="button"
                variant="subtle"
                size="xs"
                className="touch:h-10 touch:text-sm"
                onClick={() => router.navigate({ to: "/" })}
              >
                Skip
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Route = createLazyFileRoute("/auth")({
  component: AuthView,
});
