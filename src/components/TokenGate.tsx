import { useState } from "react";

export function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("newtab-todo-token") || "");
  const [input, setInput] = useState("");

  if (token) return <>{children}</>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>New Tab Todo</h1>
      <p>Enter your auth token to get started.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem("newtab-todo-token", input);
          setToken(input);
        }}
      >
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Auth token"
        />
        <button type="submit">Save</button>
      </form>
    </div>
  );
}
