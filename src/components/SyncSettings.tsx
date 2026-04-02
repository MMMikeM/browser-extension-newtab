import { useEffect, useState } from "react";
import { useValue } from "@legendapp/state/react";
import { useForm } from "@tanstack/react-form";
import { authToken$ } from "~/lib/auth-token";
import { currentUser$, setCurrentUser, clearCurrentUserId } from "~/lib/current-user";
import { registerPushSubscription, unregisterPushSubscription, isPushSubscribed } from "~/lib/push";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { loginFn, signupFn, logoutFn, loginSchema, signupSchema } from "~/rpc/auth";
import { getBuildTarget } from "~/lib/build-target";
import { TOKEN_KEY, MSG_TOKEN_CHANGED } from "~/lib/constants";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

const persistToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  authToken$.set(token);
  if (getBuildTarget() === "extension") {
    browser.storage.local.set({ [TOKEN_KEY]: token });
    browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => { });
  }
};

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  authToken$.set(null);
  clearCurrentUserId();
  if (getBuildTarget() === "extension") {
    browser.storage.local.remove(TOKEN_KEY);
    browser.runtime.sendMessage({ type: MSG_TOKEN_CHANGED }).catch(() => { });
  }
  unregisterPushSubscription();
};

export function SyncSettings() {
  const token = useValue(authToken$);
  const currentUser = useValue(currentUser$);
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
        const result =
          mode === "login"
            ? await loginFn({ data: { username: value.username.trim(), password: value.password, name: "" } })
            : await signupFn({ data: { username: value.username.trim(), password: value.password, name: value.name.trim() } });
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
      await logoutFn();
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
        ⚙
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
        <form.Field name="name" validators={{ onChange: schema.shape.name }}>
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
        <Button size="sm" className="h-7 text-xs" disabled={form.state.isSubmitting || !form.state.canSubmit}>
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
