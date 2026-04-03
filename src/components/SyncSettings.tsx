import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { useAuthToken, setAuthToken } from "~/lib/auth-token";
import { useCurrentUser, setCurrentUser, clearCurrentUser } from "~/lib/current-user";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "~/lib/push";
import { client } from "~/lib/api";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const persistToken = (token: string) => {
  setAuthToken(token);
  if (getBuildTarget() === "extension") {
    browser.storage.local.set({ [TOKEN_KEY]: token });
    browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {});
  }
};

const clearAuth = () => {
  setAuthToken(null);
  clearCurrentUser();
  if (getBuildTarget() === "extension") {
    browser.storage.local.remove(TOKEN_KEY);
    browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => {});
  }
  unregisterPushSubscription();
};

export function SyncSettings() {
  const token = useAuthToken();
  const currentUser = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  const schema = mode === "login" ? loginSchema : signupSchema;
  const form = useForm({
    defaultValues: { username: "", password: "", name: "" },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const endpoint = mode === "login" ? client.api.auth.login : client.api.auth.signup;
        const res = await endpoint.$post({
          json: { username: value.username.trim(), password: value.password, name: value.name.trim() },
        });
        if (!res.ok) {
          const body = await res.json() as { error?: string };
          throw new Error(body.error ?? "Authentication failed");
        }
        const result = await res.json() as { userId: string; token: string; name: string; username: string };
        persistToken(result.token);
        setCurrentUser({ id: result.userId, name: result.name, username: result.username });
        form.reset();
        setOpen(false);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "Authentication failed");
      }
    },
  });

  useEffect(() => {
    isPushSubscribed().then(setPushEnabled);
  }, []);

  const handleTogglePush = async () => {
    if (pushEnabled) {
      await unregisterPushSubscription();
      setPushEnabled(false);
    } else {
      const ok = await registerPushSubscription(VAPID_PUBLIC_KEY);
      setPushEnabled(ok);
    }
  };

  const handleLogout = async () => {
    try {
      await client.api.auth.logout.$post();
    } catch {
      // Still clear local state even if server call fails
    }
    clearAuth();
    setPushEnabled(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Sync settings"
      >
        &#x2699;
      </button>
    );
  }

  if (token && currentUser) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {currentUser.name} (@{currentUser.username})
        </span>
        {getBuildTarget() === "browser" && (
          <button
            onClick={handleTogglePush}
            className="text-left text-xs text-muted-foreground hover:text-foreground"
          >
            {pushEnabled ? "✓ Background sync enabled" : "Enable background sync"}
          </button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleLogout}>
            Log out
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-2"
    >
      {mode === "signup" && (
        <form.Field name="name" validators={{ onChange: signupSchema.shape.name }}>
          {(field) => (
            <>
              <Input
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Name"
                className="h-7 w-48 text-xs"
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <span className="text-xs text-destructive">{typeof field.state.meta.errors[0] === "string" ? field.state.meta.errors[0] : field.state.meta.errors[0]?.message}</span>
              )}
            </>
          )}
        </form.Field>
      )}
      <form.Field name="username" validators={{ onChange: schema.shape.username }}>
        {(field) => (
          <>
            <Input
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Username"
              className="h-7 w-48 text-xs"
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive">{typeof field.state.meta.errors[0] === "string" ? field.state.meta.errors[0] : field.state.meta.errors[0]?.message}</span>
            )}
          </>
        )}
      </form.Field>
      <form.Field name="password" validators={{ onChange: schema.shape.password }}>
        {(field) => (
          <>
            <Input
              type="password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Password"
              className="h-7 w-48 text-xs"
            />
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
              <span className="text-xs text-destructive">{typeof field.state.meta.errors[0] === "string" ? field.state.meta.errors[0] : field.state.meta.errors[0]?.message}</span>
            )}
          </>
        )}
      </form.Field>
      {serverError && <span className="text-xs text-destructive">{serverError}</span>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="h-7 text-xs">
          {mode === "login" ? "Log in" : "Sign up"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            form.reset();
            setServerError(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
