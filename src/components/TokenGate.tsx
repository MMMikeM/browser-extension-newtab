import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("newtab-todo-token") || "");
  const [input, setInput] = useState("");

  if (token) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>New Tab Todo</CardTitle>
          <CardDescription>Enter your auth token to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem("newtab-todo-token", input);
              setToken(input);
            }}
          >
            <Input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Auth token"
            />
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
