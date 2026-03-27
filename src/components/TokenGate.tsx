import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

const TOKEN_KEY = "newtab-todo-token";

function readToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(readToken);
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
              localStorage.setItem(TOKEN_KEY, input);
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
