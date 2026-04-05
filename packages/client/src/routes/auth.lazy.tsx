import { useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/mini";
import { setAuthToken } from "~/lib/auth/token";
import { setCurrentUser } from "~/lib/auth/current-user";
import { client } from "~/lib/api";
import { Button } from "~/components/ui/button";
import { FormField } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
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
      try {
        const endpoint = mode === "login" ? client.api.auth.login : client.api.auth.signup;
        const res = await endpoint.$post({
          json: {
            username: value.username.trim(),
            password: value.password,
            name: value.name.trim(),
          },
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Authentication failed");
        }
        const result = (await res.json()) as {
          userId: string;
          token: string;
          name: string;
          username: string;
        };
        persistToken(result.token);
        setCurrentUser({ id: result.userId, name: result.name, username: result.username });
        const pendingInvite = sessionStorage.getItem("pending-invite");
        if (pendingInvite) {
          sessionStorage.removeItem("pending-invite");
          router.navigate({ to: "/invite/$token", params: { token: pendingInvite } });
        } else {
          router.navigate({ to: "/" });
        }
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Authentication failed");
      }
    },
  });

  return (
    <div className="flex flex-col items-center justify-center py-8 min-h-[50vh] touch:min-h-0 touch:pt-[12vh] touch:pb-10">
      <div className="w-full max-w-xs">
        <p className="text-center text-sm text-hint mb-6">
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
                    placeholder="Your name"
                    className="text-sm"
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
                  placeholder="Username"
                  className="text-sm"
                  autoFocus={mode === "login"}
                  autoCapitalize="none"
                  autoCorrect="off"
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
                  placeholder="Password"
                  className="text-sm"
                />
              </FormField>
            )}
          </form.Field>
          {serverError && <span className="text-xs text-destructive">{serverError}</span>}
          <div className="flex flex-col gap-2 mt-1">
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={form.state.isSubmitting}
            >
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  form.reset();
                  setServerError(null);
                }}
                className="text-xs text-hint hover:text-muted-foreground"
              >
                {mode === "login" ? "Create an account" : "Already have an account?"}
              </button>
              <button
                type="button"
                onClick={() => router.navigate({ to: "/" })}
                className="text-xs text-hint hover:text-muted-foreground"
              >
                Skip
              </button>
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
